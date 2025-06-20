// Utility to call Stability AI API for image generation
// Usage: generateImageFromText(prompt)

export async function generateImageFromText(prompt) {
  const apiKey = import.meta.env.VITE_STABILITY_API_KEY;
  if (!apiKey) {
    throw new Error('Stability AI API key not set in environment variables.');
  }

  // Compose a high-quality fiction scene prompt
  const qualityPrompt = [
    "A highly detailed, cinematic illustration of a dramatic fiction scene,",
    "vivid colors, dynamic lighting, intricate background, expressive characters,",
    "fantasy atmosphere, ultra-realistic, 4k, trending on artstation, masterpiece,",
    prompt // append the user-provided prompt to the end
  ].join(' ');

  const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      text_prompts: [{ text: qualityPrompt }],
      cfg_scale: 7,
      height: 512,
      width: 512,
      samples: 1,
      steps: 30,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stability AI API error: ${error}`);
  }

  const data = await response.json();
  // The API returns base64-encoded images in 'artifacts'
  const base64 = data.artifacts?.[0]?.base64;
  if (!base64) throw new Error('No image returned from Stability AI API.');
  return `data:image/png;base64,${base64}`;
} 