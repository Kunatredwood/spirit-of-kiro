import { serve } from "bun";
import { handleImageRoute } from "./handlers/image-handler";

// Configuration
const PORT = process.env.PORT || 3001;

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Main server
const server = serve({
  port: PORT,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;

    console.log(`${method} ${url.pathname}`);

    // Handle CORS preflight requests
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    // Handle /health endpoint
    if (url.pathname === "/" && method === "GET") {
      return new Response("OK", {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain"
        }
      });
    }

    // Handle /image endpoint
    if (url.pathname === "/image" && method === "GET") {
      return handleImageRoute(req);
    }

    // Handle /images/* endpoint - serve local images
    if (url.pathname.startsWith("/images/") && method === "GET") {
      try {
        const fileName = url.pathname.replace("/images/", "");
        const filePath = `./images/${fileName}`;
        const file = Bun.file(filePath);
        
        if (await file.exists()) {
          return new Response(file, {
            headers: {
              ...corsHeaders,
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=31536000"
            }
          });
        } else {
          return new Response(JSON.stringify({ error: "Image not found" }), {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
      } catch (error) {
        console.error("Error serving image:", error);
        return new Response(JSON.stringify({ error: "Error serving image" }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
    }

    // Handle 404 for unknown routes
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  },
});

console.log(`Item images server running at http://localhost:${PORT}`);