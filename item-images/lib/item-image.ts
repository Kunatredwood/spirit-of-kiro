import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { S3_CONFIG, CLOUDFRONT_CONFIG } from '../config';
import { nearestMatch, storeKeyValue } from '../state/vector-store';
import { Buffer } from "node:buffer";

const IMAGES_BUCKET_NAME = S3_CONFIG.bucketName;
if (!IMAGES_BUCKET_NAME) {
  throw new Error('S3_BUCKET_NAME environment variable is required');
}

const CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME = CLOUDFRONT_CONFIG.domain;
if (!CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME) {
  throw new Error('CLOUDFRONT_DOMAIN environment variable is required');
}

const bedrockRuntime = new BedrockRuntimeClient({ region: "us-west-2" });
const s3Client = new S3Client();

export async function generateImage(prompt) {
  console.log(`[BEDROCK] Invoking Bedrock with model: stability.stable-image-core-v1:1`);
  console.log(`[BEDROCK] Prompt: "${prompt}"`);
  
  const requestBody = {
    prompt: prompt,
    negative_prompt: 'shadow, floor, human, person, realistic',
    mode: 'text-to-image',
    aspect_ratio: '1:1',
    output_format: 'png',
    seed: Math.floor(Math.random() * 4294967295)
  };
  
  console.log('[BEDROCK] Request body:', JSON.stringify(requestBody, null, 2));
  
  const params = {
    modelId: 'stability.stable-image-core-v1:1',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody)
  };

  try {
    console.log('[BEDROCK] Sending InvokeModelCommand...');
    const command = new InvokeModelCommand(params);
    const response = await bedrockRuntime.send(command);
    console.log('[BEDROCK] Received response from Bedrock');
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log(`[BEDROCK] Response contains ${responseBody.images?.length || 0} image(s)`);
    return responseBody.images[0];
  } catch (error) {
    console.error('[BEDROCK] Error generating image:', error);
    console.error('[BEDROCK] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode
    });
    throw error;
  }
}

export async function uploadToS3(imageData, fileName) {
  console.log(`[STORAGE] Processing image for storage: ${fileName}`);
  console.log(`[STORAGE] Image data size: ${imageData.length} bytes`);
  
  // Resize the base64 image to 320x320 pixels
  console.log('[STORAGE] Resizing image to 320x320...');
  const resizedImageBuffer = await sharp(Buffer.from(imageData, 'base64'))
    .resize(320, 320)
    .toBuffer();
  console.log(`[STORAGE] Resized image buffer size: ${resizedImageBuffer.length} bytes`);

  // Check if we should use local storage (no S3 bucket configured or localhost)
  const useLocalStorage = !IMAGES_BUCKET_NAME || IMAGES_BUCKET_NAME === 'local';
  
  if (useLocalStorage) {
    // Store locally
    console.log('[STORAGE] Using local file storage');
    const fs = await import('fs');
    const path = await import('path');
    
    // Create images directory if it doesn't exist
    const imagesDir = path.join(process.cwd(), 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log(`[STORAGE] Created images directory: ${imagesDir}`);
    }
    
    // Save the image file
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, resizedImageBuffer);
    console.log(`[STORAGE] Saved image to: ${filePath}`);
    
    // Return a local URL that the browser can access
    // Use localhost:3001 since the port is exposed to the host
    const localUrl = `http://localhost:3001/images/${fileName}`;
    console.log(`[STORAGE] Local URL: ${localUrl}`);
    return localUrl;
  }

  // Use S3 storage (production)
  const params = {
    Bucket: IMAGES_BUCKET_NAME,
    Key: fileName,
    Body: resizedImageBuffer,
    ContentType: "image/png",
    CacheControl: "public, max-age=31536000"
  };

  try {
    console.log(`[STORAGE] Uploading to S3 bucket: ${IMAGES_BUCKET_NAME}`);
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    const url = `https://${CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME}/${fileName}`;
    console.log(`[STORAGE] S3 upload successful: ${url}`);
    return url;
  } catch (error) {
    console.error('[STORAGE] Error uploading to S3:', error);
    console.error('[STORAGE] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      bucket: IMAGES_BUCKET_NAME,
      key: fileName
    });
    throw error;
  }
}

export async function generateAndUploadImage(item) {
  const imagePrompt = `Single, standalone ${item.icon}. Simple, rounded pixel art design, soft pastel colors. Neutral, solid color background`;
  console.log(`[GENERATE] Starting image generation for "${item.icon}"`);
  console.log(`[GENERATE] Prompt: "${imagePrompt}"`);
  
  let attempts = 0;
  let imageData;
  while (attempts < 3) {
    try {
      console.log(`[GENERATE] Attempt ${attempts + 1}/3: Calling Bedrock...`);
      imageData = await generateImage(imagePrompt);
      console.log(`[GENERATE] Successfully generated image data (${imageData.length} bytes)`);
      break;
    } catch (error) {
      attempts++;
      console.error(`[GENERATE] Attempt ${attempts} failed:`, error.message);
      if (attempts === 3) {
        console.error('[GENERATE] All attempts failed, throwing error');
        throw error;
      }
      console.log(`[GENERATE] Retrying...`);
    }
  }
  
  const fileName = `${item.id}.png`;
  console.log(`[GENERATE] Uploading to S3 as: ${fileName}`);
  const s3Url = await uploadToS3(imageData, fileName);
  console.log(`[GENERATE] Upload complete: ${s3Url}`);
  return s3Url;
}

/**
 * Gets the key to use for vector operations for an item
 * @param {Object} item - The item object
 * @returns {string} - Key for vector operations
 */
function getItemVectorKey(item) {
  // Use the item's icon as the key for vector operations
  return item.icon;
}

/**
 * Gets an image for an item, either from the vector store or by generating a new one
 * @param {Object} item - The item object to get an image for
 * @param {number} [similarityThreshold=0.3] - Threshold for considering images similar (0-1)
 * @returns {Promise<string>} - URL of the image
 */
export async function getImage(item, similarityThreshold = 0.25) {
  console.log(`[GET IMAGE] Starting for item: "${item.icon}" (id: ${item.id})`);
  let similarImage;
  try {
    // Get the key for vector operations
    const itemKey = getItemVectorKey(item);
    console.log(`[GET IMAGE] Vector key: "${itemKey}"`);
    
    // Search for similar images in the vector store
    console.log('[GET IMAGE] Searching for similar images in vector store...');
    similarImage = await nearestMatch(itemKey);

    if (similarImage && similarImage.value.score < similarityThreshold) {
      console.log(`[GET IMAGE] MATCH FOUND: "${item.icon}" to "${similarImage.value.text}" with score ${similarImage.value.score}: ${similarImage.value.value}`);
      return similarImage.value.value;
    }
    
    if (similarImage) {
      console.log(`[GET IMAGE] Similar image found but score ${similarImage.value.score} exceeds threshold ${similarityThreshold}`);
    } else {
      console.log('[GET IMAGE] No similar image found in vector store');
    }
    
    // No similar image found, generate a new one
    console.log('[GET IMAGE] Generating new image...');
    const imageUrl = await generateAndUploadImage(item);
    console.log(`[GET IMAGE] Generated new image: ${imageUrl}`);
    
    // Store the new image with its key
    console.log('[GET IMAGE] Storing image in vector store...');
    await storeKeyValue(
      itemKey,  // Use item icon as the key
      imageUrl,  // Store the image URL as the value
      { id: item.id, text: itemKey }  // Store item metadata
    );
    console.log('[GET IMAGE] Image stored successfully');
    
    if (similarImage) {
      console.log(`[GET IMAGE] NEW IMAGE: "${item.icon}" (closest match was "${similarImage.value.key_text}" with score ${similarImage.value.score}): ${imageUrl}`);
    } else {
      console.log(`[GET IMAGE] NEW IMAGE: "${item.icon}" (no previous matches): ${imageUrl}`);
    }
    return imageUrl;
  } catch (error) {
    console.error(`[GET IMAGE] ERROR for "${item.icon}":`, error);
    console.error('[GET IMAGE] Error stack:', error.stack);

    if (similarImage) {
      console.log(`[GET IMAGE] FALLBACK: Using similar image "${similarImage.value.text}" with score ${similarImage.value.score}: ${similarImage.value.value}`);      
      return similarImage.value.value;
    } else {
      console.error('[GET IMAGE] No fallback available, rethrowing error');
      throw error;
    }
  }
}