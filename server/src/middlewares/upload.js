import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Go up two levels from src/middlewares to server root, then up one to project root, then to public
// d:\vinyl-demo\server\src\middlewares -> d:\vinyl-demo\server\src -> d:\vinyl-demo\server -> d:\vinyl-demo -> d:\vinyl-demo\public
const publicDir = path.join(__dirname, '../../../public');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'misc';
    if (file.fieldname === 'audio') {
      folder = 'songs';
    } else if (
      file.fieldname === 'cover'
      || file.fieldname === 'vinylImage'
      || file.fieldname === 'profileImage'
      || file.fieldname === 'coverImage'
    ) {
      folder = 'images'; // or 'album-art'
    } else if (file.fieldname === 'lyrics') {
      folder = 'lyrics';
    }

    
    const uploadPath = path.join(publicDir, folder);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'audio') {
    if (file.mimetype.startsWith('audio/') || file.originalname.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type'), false);
    }
  } else if (
    file.fieldname === 'cover'
    || file.fieldname === 'vinylImage'
    || file.fieldname === 'profileImage'
    || file.fieldname === 'coverImage'
  ) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image file type'), false);
    }
  } else if (file.fieldname === 'lyrics') {
     if (file.originalname.endsWith('.lrc') || file.originalname.endsWith('.txt')) {
       cb(null, true);
     } else {
       cb(new Error('Invalid lyrics file type'), false);
     }
  } else {
    cb(null, true);
  }
};

export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});
