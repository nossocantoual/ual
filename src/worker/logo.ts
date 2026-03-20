import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

// Upload logo
app.post('/api/admin/upload-logo', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('logo') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return c.json({ error: 'File must be an image' }, 400);
    }
    
    // Generate a unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `logos/logo-${timestamp}.${extension}`;
    
    // Upload to R2
    await c.env.R2_BUCKET.put(filename, file, {
      httpMetadata: {
        contentType: file.type,
      },
    });
    
    // Update settings with new logo URL
    const logoUrl = `/api/logo/${filename}`;
    await c.env.DB.prepare(
      'UPDATE settings SET value = ? WHERE key = ?'
    ).bind(logoUrl, 'logo_url').run();
    
    return c.json({ success: true, logo_url: logoUrl });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return c.json({ error: 'Failed to upload logo' }, 500);
  }
});

// Get logo
app.get('/api/logo/:path{.+}', async (c) => {
  try {
    const path = c.req.param('path');
    const object = await c.env.R2_BUCKET.get(path);
    
    if (!object) {
      return c.notFound();
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000');
    
    return c.body(object.body, { headers });
  } catch (error) {
    console.error('Error getting logo:', error);
    return c.notFound();
  }
});

export default app;
