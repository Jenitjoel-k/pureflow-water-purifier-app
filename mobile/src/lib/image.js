// Product images are URLs in Firebase mode and bundled assets in the offline
// demo (a number on Android, an asset object on web). Returns an expo-image source.
export const imageSource = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return { uri: img };
  return img;
};
