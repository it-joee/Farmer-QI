const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/okyea/Downloads/Documents/WORK/jni-farmerIQ/apps/web/src/pages';
const files = [
  'PendingOfftakerDetailPage.tsx',
  'OfftakerDetailPage.tsx',
  'EditPendingOfftakerPage.tsx',
  'EditOfftakerPage.tsx',
  'AddOfftakerPage.tsx',
];

for (const file of files) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/designationnt/g, 'agent');
  content = content.replace(/Pdesignation/g, 'Page');
  content = content.replace(/stdesignation/g, 'stage');
  content = content.replace(/messdesignation/g, 'message');
  content = content.replace(/imdesignation/g, 'image');
  content = content.replace(/target_products: CapturedPhoto\[\]/g, 'ghanaCardPhotos: CapturedPhoto[]');
  content = content.replace(/target_products, setGhanaCardPhotos/g, 'ghanaCardPhotos, setGhanaCardPhotos');
  content = content.replace(/target_products,/g, 'ghanaCardPhotos,');
  content = content.replace(/target_products={target_products}/g, 'ghanaCardPhotos={ghanaCardPhotos}');
  
  // Undo the weird ghana_card -> official_email for photos
  content = content.replace(/photo\.type === "official_email"/g, 'photo.photo_type === "ghana_card"');
  
  fs.writeFileSync(p, content);
}
