import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { S3_CONFIG, CLOUDFRONT_CONFIG } from '../config';
import { nearestMatch, storeKeyValue } from '../state/vector-store';
import { Buffer } from "node:buffer";

// ============================================================================
// Types
// ============================================================================

export interface Item {
  id: string;
  icon: string;
  [key: string]: unknown;
}

interface BedrockImageRequest {
  prompt: string;
  negative_prompt: string;
  mode: 'text-to-image';
  aspect_ratio: '1:1';
  output_format: 'png';
  seed: number;
}

interface BedrockImageResponse {
  images: string[];
}

interface VectorMatch {
  value: {
    text: string;
    value: string;
    score: number;
    key_text?: string;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const IMAGES_BUCKET_NAME = S3_CONFIG.bucketName;
if (!IMAGES_BUCKET_NAME) {
  throw new Error('S3_BUCKET_NAME environment variable is required');
}

const CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME = CLOUDFRONT_CONFIG.domain;
if (!CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME) {
  throw new Error('CLOUDFRONT_DOMAIN environment variable is required');
}

// Model configuration
const BEDROCK_REGION = "us-west-2";
const BEDROCK_MODEL_ID = "stability.stable-image-core-v1:1";
const IMAGE_SIZE = 320;
const MAX_GENERATION_ATTEMPTS = 3;
const DEFAULT_SIMILARITY_THRESHOLD = 0.25;

// Image generation parameters
const NEGATIVE_PROMPT = 'shadow, floor, human, person, realistic';
const IMAGE_ASPECT_RATIO = '1:1';
const IMAGE_FORMAT = 'png';

// Storage configuration
const LOCAL_IMAGES_PORT = 3001;
const S3_CACHE_CONTROL = "public, max-age=31536000";

// ============================================================================
// AWS Clients
// ============================================================================

const bedrockRuntime = new BedrockRuntimeClient({ region: BEDROCK_REGION });
const s3Client = new S3Client();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a random seed for image generation
 * @returns {number} Random 32-bit unsigned integer
 */
function generateRandomSeed(): number {
  return Math.floor(Math.random() * 4294967295);
}

/**
 * Logs error details in a structured format
 * @param {string} context - Context identifier for the error
 * @param {any} error - The error object
 */
function logError(context: string, error: any): void {
  console.error(`[${context}] Error:`, error);
  console.error(`[${context}] Error details:`, {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    statusCode: error?.$metadata?.httpStatusCode
  });
}

/**
 * Checks if local storage should be used instead of S3
 * @returns {boolean} True if local storage should be used
 */
function shouldUseLocalStorage(): boolean {
  return !IMAGES_BUCKET_NAME || IMAGES_BUCKET_NAME === 'local';
}

/**
 * Builds the image generation prompt
 * @param {string} iconDescription - Description of the item icon
 * @returns {string} Formatted prompt for image generation
 */
function buildImagePrompt(iconDescription: string): string {
  return `Single, standalone ${iconDescription}. Simple, rounded pixel art design, soft pastel colors. Neutral, solid color background`;
}

// ============================================================================
// Image Generation
// ============================================================================

/**
 * Generates an image using AWS Bedrock
 * @param {string} prompt - Text prompt describing the desired image
 * @returns {Promise<string>} Base64-encoded image data
 */
export async function generateImage(prompt: string): Promise<string> {
  console.log(`[BEDROCK] Invoking Bedrock with model: ${BEDROCK_MODEL_ID}`);
  console.log(`[BEDROCK] Prompt: "${prompt}"`);

  const requestBody: BedrockImageRequest = {
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    mode: 'text-to-image',
    aspect_ratio: IMAGE_ASPECT_RATIO,
    output_format: IMAGE_FORMAT,
    seed: generateRandomSeed()
  };

  console.log('[BEDROCK] Request body:', JSON.stringify(requestBody, null, 2));

  const params = {
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody)
  };

  try {
    console.log('[BEDROCK] Sending InvokeModelCommand...');
    const command = new InvokeModelCommand(params);
    const response = await bedrockRuntime.send(command);
    console.log('[BEDROCK] Received response from Bedrock');

    const responseBody: BedrockImageResponse = JSON.parse(
      new TextDecoder().decode(response.body)
    );

    console.log(`[BEDROCK] Response contains ${responseBody.images?.length || 0} image(s)`);

    if (!responseBody.images || responseBody.images.length === 0) {
      throw new Error('No images returned from Bedrock');
    }

    return responseBody.images[0];
  } catch (error) {
    logError('BEDROCK', error);
    throw error;
  }
}

// ============================================================================
// Image Storage
// ============================================================================

/**
 * Resizes base64 image data to specified dimensions
 * @param {string} imageData - Base64-encoded image data
 * @param {number} size - Target size for both width and height
 * @returns {Promise<Buffer>} Resized image buffer
 */
async function resizeImage(imageData: string, size: number): Promise<Buffer> {
  console.log(`[STORAGE] Resizing image to ${size}x${size}...`);
  const resizedBuffer = await sharp(Buffer.from(imageData, 'base64'))
    .resize(size, size)
    .toBuffer();
  console.log(`[STORAGE] Resized image buffer size: ${resizedBuffer.length} bytes`);
  return resizedBuffer;
}

/**
 * Stores image locally in the filesystem
 * @param {Buffer} imageBuffer - Image data buffer
 * @param {string} fileName - Name for the image file
 * @returns {Promise<string>} Local URL to access the image
 */
async function storeImageLocally(imageBuffer: Buffer, fileName: string): Promise<string> {
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
  fs.writeFileSync(filePath, imageBuffer);
  console.log(`[STORAGE] Saved image to: ${filePath}`);

  // Return a local URL that the browser can access
  const localUrl = `http://localhost:${LOCAL_IMAGES_PORT}/images/${fileName}`;
  console.log(`[STORAGE] Local URL: ${localUrl}`);
  return localUrl;
}

/**
 * Uploads image to S3 and returns CloudFront URL
 * @param {Buffer} imageBuffer - Image data buffer
 * @param {string} fileName - Name for the image file in S3
 * @returns {Promise<string>} CloudFront URL for the uploaded image
 */
async function uploadImageToS3(imageBuffer: Buffer, fileName: string): Promise<string> {
  const params = {
    Bucket: IMAGES_BUCKET_NAME,
    Key: fileName,
    Body: imageBuffer,
    ContentType: "image/png",
    CacheControl: S3_CACHE_CONTROL
  };

  try {
    console.log(`[STORAGE] Uploading to S3 bucket: ${IMAGES_BUCKET_NAME}`);
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    const url = `https://${CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME}/${fileName}`;
    console.log(`[STORAGE] S3 upload successful: ${url}`);
    return url;
  } catch (error: any) {
    console.error('[STORAGE] Error uploading to S3:', error);
    console.error('[STORAGE] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      bucket: IMAGES_BUCKET_NAME,
      key: fileName
    });
    throw error;
  }
}

/**
 * Uploads an image to storage (local or S3 based on configuration)
 * @param {string} imageData - Base64-encoded image data
 * @param {string} fileName - Name for the image file
 * @returns {Promise<string>} URL to access the uploaded image
 */
export async function uploadToS3(imageData: string, fileName: string): Promise<string> {
  console.log(`[STORAGE] Processing image for storage: ${fileName}`);
  console.log(`[STORAGE] Image data size: ${imageData.length} bytes`);

  // Resize the image to standard dimensions
  const resizedImageBuffer = await resizeImage(imageData, IMAGE_SIZE);

  // Choose storage method based on configuration
  if (shouldUseLocalStorage()) {
    return await storeImageLocally(resizedImageBuffer, fileName);
  }

  return await uploadImageToS3(resizedImageBuffer, fileName);
}

/**
 * Generates an image with retry logic
 * @param {string} prompt - Image generation prompt
 * @param {number} maxAttempts - Maximum number of retry attempts
 * @returns {Promise<string>} Base64-encoded image data
 */
async function generateImageWithRetry(prompt: string, maxAttempts: number): Promise<string> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      console.log(`[GENERATE] Attempt ${attempts + 1}/${maxAttempts}: Calling Bedrock...`);
      const imageData = await generateImage(prompt);
      console.log(`[GENERATE] Successfully generated image data (${imageData.length} bytes)`);
      return imageData;
    } catch (error: any) {
      attempts++;
      console.error(`[GENERATE] Attempt ${attempts} failed:`, error?.message);

      if (attempts === maxAttempts) {
        console.error('[GENERATE] All attempts failed, throwing error');
        throw error;
      }

      console.log(`[GENERATE] Retrying...`);
    }
  }

  throw new Error('Failed to generate image after all attempts');
}

/**
 * Generates and uploads an image for an item
 * @param {Item} item - Item to generate image for
 * @returns {Promise<string>} URL of the uploaded image
 */
export async function generateAndUploadImage(item: Item): Promise<string> {
  const imagePrompt = buildImagePrompt(item.icon);
  console.log(`[GENERATE] Starting image generation for "${item.icon}"`);
  console.log(`[GENERATE] Prompt: "${imagePrompt}"`);

  const imageData = await generateImageWithRetry(imagePrompt, MAX_GENERATION_ATTEMPTS);

  const fileName = `${item.id}.png`;
  console.log(`[GENERATE] Uploading to storage as: ${fileName}`);
  const imageUrl = await uploadToS3(imageData, fileName);
  console.log(`[GENERATE] Upload complete: ${imageUrl}`);
  return imageUrl;
}

// ============================================================================
// Vector Store Operations
// ============================================================================

/**
 * Gets the key to use for vector operations for an item
 * @param {Item} item - The item object
 * @returns {string} Key for vector operations (uses item's icon)
 */
function getItemVectorKey(item: Item): string {
  return item.icon;
}

/**
 * Logs match result information
 * @param {Item} item - The item being searched
 * @param {VectorMatch | null} match - The vector match result
 * @param {number} threshold - Similarity threshold
 */
function logMatchResult(item: Item, match: VectorMatch | null, threshold: number): void {
  if (!match) {
    console.log('[GET IMAGE] No similar image found in vector store');
    return;
  }

  if (match.value.score < threshold) {
    console.log(
      `[GET IMAGE] MATCH FOUND: "${item.icon}" to "${match.value.text}" ` +
      `with score ${match.value.score}: ${match.value.value}`
    );
  } else {
    console.log(
      `[GET IMAGE] Similar image found but score ${match.value.score} ` +
      `exceeds threshold ${threshold}`
    );
  }
}

/**
 * Stores generated image in vector store
 * @param {string} key - Vector key for the image
 * @param {string} imageUrl - URL of the generated image
 * @param {Item} item - Item object for metadata
 */
async function storeGeneratedImage(key: string, imageUrl: string, item: Item): Promise<void> {
  console.log('[GET IMAGE] Storing image in vector store...');
  await storeKeyValue(
    key,
    imageUrl,
    { id: item.id, text: key }
  );
  console.log('[GET IMAGE] Image stored successfully');
}

/**
 * Logs new image generation result
 * @param {Item} item - The item for which image was generated
 * @param {string} imageUrl - URL of the generated image
 * @param {VectorMatch | null} similarImage - Similar image match if any
 */
function logNewImageResult(item: Item, imageUrl: string, similarImage: VectorMatch | null): void {
  if (similarImage) {
    console.log(
      `[GET IMAGE] NEW IMAGE: "${item.icon}" ` +
      `(closest match was "${similarImage.value.key_text}" with score ${similarImage.value.score}): ${imageUrl}`
    );
  } else {
    console.log(`[GET IMAGE] NEW IMAGE: "${item.icon}" (no previous matches): ${imageUrl}`);
  }
}

/**
 * Gets an image for an item, either from the vector store or by generating a new one
 * @param {Item} item - The item object to get an image for
 * @param {number} [similarityThreshold] - Threshold for considering images similar (0-1, lower is more similar)
 * @returns {Promise<string>} URL of the image
 */
export async function getImage(
  item: Item,
  similarityThreshold: number = DEFAULT_SIMILARITY_THRESHOLD
): Promise<string> {
  console.log(`[GET IMAGE] Starting for item: "${item.icon}" (id: ${item.id})`);
  let similarImage: VectorMatch | null = null;

  try {
    // Get the key for vector operations
    const itemKey = getItemVectorKey(item);
    console.log(`[GET IMAGE] Vector key: "${itemKey}"`);

    // Search for similar images in the vector store
    console.log('[GET IMAGE] Searching for similar images in vector store...');
    similarImage = await nearestMatch(itemKey);

    logMatchResult(item, similarImage, similarityThreshold);

    // If we found a sufficiently similar image, return it
    if (similarImage && similarImage.value.score < similarityThreshold) {
      return similarImage.value.value;
    }

    // No similar image found, generate a new one
    console.log('[GET IMAGE] Generating new image...');
    const imageUrl = await generateAndUploadImage(item);
    console.log(`[GET IMAGE] Generated new image: ${imageUrl}`);

    // Store the new image with its key
    await storeGeneratedImage(itemKey, imageUrl, item);

    logNewImageResult(item, imageUrl, similarImage);

    return imageUrl;
  } catch (error: any) {
    console.error(`[GET IMAGE] ERROR for "${item.icon}":`, error);
    console.error('[GET IMAGE] Error stack:', error?.stack);

    // Try to use a similar image as fallback if available
    if (similarImage) {
      console.log(
        `[GET IMAGE] FALLBACK: Using similar image "${similarImage.value.text}" ` +
        `with score ${similarImage.value.score}: ${similarImage.value.value}`
      );
      return similarImage.value.value;
    }

    console.error('[GET IMAGE] No fallback available, rethrowing error');
    throw error;
  }
}