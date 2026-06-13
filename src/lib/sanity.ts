import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const sanityClient = createClient({
  projectId: 'mztrtvp5',
  dataset: 'production',
  useCdn: false,
  token: 'sk88QcXq93XiXI8VqnUfhX9kL9vV5pmWNg7Iz5mj2AdJIZC98zBKus77ScTTdaBqvhZNNItGMaAljJiLHQBq65aVX29SOaSIVf4O67TDuAsGt2w6OdHWdwv18I73Rd0GjIPNs3JWsS0OkTeuAhcFDpAcK0kZVdwXfDOCMDTDgwScr8j8GOPQ',
  apiVersion: '2024-06-11',
});

const builder = imageUrlBuilder(sanityClient);
export function urlFor(source: any) {
  return builder.image(source);
}