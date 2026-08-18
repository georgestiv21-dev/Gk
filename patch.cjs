const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// I'll just use string replacement on a very specific large block
const startStr = `app.post("/api/admin/videos/upload", upload.single("video"), async (req, res) => {`;
const endStr = `// 6. Admin: Add Video`;

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newRoute = `app.post("/api/admin/videos/upload", upload.single("video"), async (req, res) => {
  const adminKey = req.headers["x-admin-key"] as string || req.body?.adminKey;
  if (!isAdminKey(adminKey) || isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Unauthorized." });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No video file provided." });
  }

  const storjBucket = process.env.STORJ_BUCKET_NAME;
  if (!s3Client || !process.env.STORJ_ACCESS_KEY || !storjBucket) {
    return res.status(500).json({ error: "Storj credentials not configured in Settings." });
  }

  const fileId = uuidv4();
  const inputPath = req.file.path;
  const outputDir = path.join("/tmp", \`hls_\${fileId}\`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(\`Starting HLS processing for fileId: \${fileId}...\`);

  // Public URL format for Storj S3 Gateway
  const hlsUrl = \`https://gateway.storjshare.io/\${storjBucket}/\${fileId}/playlist.m3u8\`;
  
  // Respond immediately so the client (mobile browser/axios) doesn't timeout!
  res.json({
    success: true,
    hlsUrl: hlsUrl,
    message: "Η επεξεργασία του βίντεο ξεκίνησε στο παρασκήνιο. Θα εμφανιστεί μόλις ολοκληρωθεί!"
  });

  // Start the heavy FFmpeg work asynchronously in the background
  (async () => {
    try {
      // Process video with fluent-ffmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            '-c:v h264',
            '-c:a aac',
            '-hls_time 10',
            '-hls_list_size 0', // keep all segments in the playlist
            '-f hls'
          ])
          .output(path.join(outputDir, 'playlist.m3u8'))
          .on('end', () => {
            console.log(\`HLS processing completed for \${fileId}\`);
            resolve(true);
          })
          .on('error', (err) => {
            console.error(\`FFmpeg error for \${fileId}:\`, err);
            reject(err);
          })
          .run();
      });

      console.log(\`Uploading \${fileId} segments to Storj...\`);
      const files = fs.readdirSync(outputDir);

      for (const file of files) {
        const filePath = path.join(outputDir, file);
        const fileContent = fs.readFileSync(filePath);
        
        let contentType = 'application/octet-stream';
        if (file.endsWith('.m3u8')) contentType = 'application/x-mpegURL';
        else if (file.endsWith('.ts')) contentType = 'video/MP2T';

        await s3Client.send(new PutObjectCommand({
          Bucket: storjBucket,
          Key: \`\${fileId}/\${file}\`,
          Body: fileContent,
          ContentType: contentType
        }));
      }
      
      // Clean up local temp files
      try {
        fs.rmSync(inputPath, { force: true });
        fs.rmSync(outputDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn("Cleanup error (ignored):", cleanupErr);
      }
      
      console.log(\`Upload complete for \${fileId}. HLS URL: \${hlsUrl}\`);

    } catch (error: any) {
      console.error("HLS processing/upload error:", error);
      try {
        fs.rmSync(inputPath, { force: true });
        fs.rmSync(outputDir, { recursive: true, force: true });
      } catch(e) {}
    }
  })();
});

`;

  const newCode = code.slice(0, startIndex) + newRoute + code.slice(endIndex);
  fs.writeFileSync('server.ts', newCode);
  console.log("Patched successfully!");
} else {
  console.log("Could not find start or end markers");
}
