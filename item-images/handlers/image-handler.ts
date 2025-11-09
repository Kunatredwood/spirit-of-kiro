import { randomUUID } from 'node:crypto';
import { getImage } from '../lib/item-image';

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Interface for an item object
 */
interface Item {
  id: string;
  icon: string;
}

/**
 * Handler for the /image route
 * Generates an image based on the provided description
 * 
 * @param req - The request object
 * @returns Response - The response object
 */
export async function handleImageRoute(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const description = url.searchParams.get('description');

    console.log(`[IMAGE HANDLER] Received request for description: "${description}"`);

    // Validate description parameter
    if (!description || description.trim() === '') {
      console.log('[IMAGE HANDLER] ERROR: Missing description parameter');
      return new Response(JSON.stringify({ error: 'Description query parameter is required' }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Create a simple item object with the description as the icon
    const item: Item = {
      id: randomUUID(),
      icon: description
    };

    console.log(`[IMAGE HANDLER] Created item with id: ${item.id}, icon: "${item.icon}"`);
    console.log('[IMAGE HANDLER] Calling getImage...');

    // Use getImage function to generate an image for this item
    const imageUrl = await getImage(item);

    console.log(`[IMAGE HANDLER] Successfully got image URL: ${imageUrl}`);

    const response = {
      id: item.id,
      description: item.icon,
      imageUrl: imageUrl
    };

    // Return the image URL in a JSON response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[IMAGE HANDLER] ERROR in /image route:', error);
    console.error('[IMAGE HANDLER] Error stack:', error.stack);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}