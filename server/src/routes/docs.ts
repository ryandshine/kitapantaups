import { Hono } from 'hono'

const docs = new Hono()

const buildOpenApiSpec = (origin: string) => ({
  openapi: '3.0.3',
  info: {
    title: 'KITAPANTAUPS API',
    version: '1.0.0',
    description: 'Dokumentasi API untuk autentikasi, pengaduan, tindak lanjut, dashboard, aktivitas, master data, pengguna, dan pengaturan.',
  },
  servers: [
    { url: origin || 'http://localhost:3001' },
  ],
  tags: [
    { name: 'Health', description: 'Endpoint kesehatan layanan' },
    { name: 'Auth', description: 'Autentikasi dan profil pengguna' },
    { name: 'Aduan', description: 'Manajemen aduan' },
    { name: 'Tindak Lanjut', description: 'Manajemen tindak lanjut aduan' },
    { name: 'Dashboard', description: 'Ringkasan statistik dashboard' },
    { name: 'Activities', description: 'Aktivitas sistem dan audit trail' },
    { name: 'Master', description: 'Master data referensi' },
    { name: 'Users', description: 'Manajemen pengguna' },
    { name: 'Settings', description: 'Pengaturan aplikasi' },
    { name: 'Uploads', description: 'Akses file upload terlindungi' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      RefreshRequest: {
        type: 'object',
        properties: {
          refresh_token: { type: 'string' },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          display_name: { type: 'string' },
          phone: { type: 'string' },
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['email', 'password', 'display_name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          display_name: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'staf'] },
          phone: { type: 'string' },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          display_name: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'staf'] },
          phone: { type: 'string' },
          is_active: { type: 'boolean' },
          password: { type: 'string', minLength: 8 },
        },
      },
      AduanPayload: {
        type: 'object',
        properties: {
          surat_nomor: { type: 'string' },
          surat_tanggal: { type: 'string', format: 'date' },
          surat_asal_perihal: { type: 'string' },
          pengadu_nama: { type: 'string' },
          pengadu_telepon: { type: 'string' },
          pengadu_email: { type: 'string', format: 'email', nullable: true },
          pengadu_instansi: { type: 'string' },
          kategori_masalah: { type: 'string' },
          ringkasan_masalah: { type: 'string' },
          status: { type: 'string' },
          alasan_penolakan: { type: 'string' },
          kps_ids: {
            type: 'array',
            items: { type: 'string' },
          },
          lokasi_prov: { type: 'string' },
          lokasi_kab: { type: 'string' },
          lokasi_kec: { type: 'string' },
          lokasi_desa: { type: 'string' },
          lokasi_luas_ha: { type: 'number' },
          jumlah_kk: { type: 'number' },
          lokasi_lat: {
            type: 'array',
            items: { type: 'string' },
          },
          lokasi_lng: {
            type: 'array',
            items: { type: 'string' },
          },
          pic_id: { type: 'string', format: 'uuid', nullable: true },
          pic_name: { type: 'string' },
          surat_file_url: { type: 'string', nullable: true },
        },
      },
      TindakLanjutPayload: {
        type: 'object',
        required: ['tanggal', 'jenis_tl'],
        properties: {
          tanggal: { type: 'string', format: 'date' },
          jenis_tl: { type: 'string' },
          keterangan: { type: 'string' },
          nomor_surat_output: { type: 'string' },
          file_urls: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      ActivityPayload: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          description: { type: 'string' },
          aduan_id: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      },
      SettingUpdateRequest: {
        type: 'object',
        properties: {
          value: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Status layanan',
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login pengguna',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Login berhasil' },
          400: { description: 'Payload tidak valid' },
          401: { description: 'Login gagal' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout pengguna',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Logout berhasil' },
          401: { description: 'Tidak terautentikasi' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Token baru berhasil dibuat' },
          400: { description: 'Refresh token diperlukan' },
          401: { description: 'Refresh token tidak valid' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Ambil data user saat ini',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Data user aktif' },
          401: { description: 'Tidak terautentikasi' },
        },
      },
    },
    '/auth/profile': {
      patch: {
        tags: ['Auth'],
        summary: 'Update profil sendiri',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProfileRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Profil berhasil diperbarui' },
          400: { description: 'Tidak ada perubahan' },
        },
      },
    },
    '/aduan': {
      get: {
        tags: ['Aduan'],
        summary: 'Daftar aduan',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'offset', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'start_date', in: 'query', schema: { type: 'string' } },
          { name: 'end_date', in: 'query', schema: { type: 'string' } },
          { name: 'provinsi', in: 'query', schema: { type: 'string' } },
          { name: 'nomor_tiket', in: 'query', schema: { type: 'string' } },
          { name: 'pic_id', in: 'query', schema: { type: 'string' } },
          { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['created_at', 'updated_at'] } },
        ],
        responses: {
          200: { description: 'Daftar aduan' },
        },
      },
      post: {
        tags: ['Aduan'],
        summary: 'Buat aduan baru',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AduanPayload' },
            },
          },
        },
        responses: {
          201: { description: 'Aduan berhasil dibuat' },
          400: { description: 'Payload tidak valid' },
        },
      },
    },
    '/aduan/provinces': {
      get: {
        tags: ['Aduan'],
        summary: 'Daftar provinsi unik dari aduan',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Daftar provinsi' },
        },
      },
    },
    '/aduan/upload': {
      post: {
        tags: ['Aduan'],
        summary: 'Upload file aduan',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'aduan_id'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  aduan_id: { type: 'string' },
                  category: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'File berhasil di-upload' },
          400: { description: 'Payload upload tidak valid' },
        },
      },
    },
    '/aduan/{id}': {
      get: {
        tags: ['Aduan'],
        summary: 'Detail aduan',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Detail aduan' },
          404: { description: 'Aduan tidak ditemukan' },
        },
      },
      patch: {
        tags: ['Aduan'],
        summary: 'Update aduan',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AduanPayload' },
            },
          },
        },
        responses: {
          200: { description: 'Aduan berhasil diperbarui' },
          400: { description: 'Payload update tidak valid' },
          403: { description: 'Akses ditolak' },
          404: { description: 'Aduan tidak ditemukan' },
        },
      },
      delete: {
        tags: ['Aduan'],
        summary: 'Hapus aduan',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Aduan berhasil dihapus' },
          404: { description: 'Aduan tidak ditemukan' },
        },
      },
    },
    '/aduan/{id}/documents': {
      post: {
        tags: ['Aduan'],
        summary: 'Tambah dokumen aduan',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['file_url', 'file_name'],
                properties: {
                  file_url: { type: 'string', format: 'uri' },
                  file_name: { type: 'string' },
                  file_category: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Dokumen berhasil ditambahkan' },
        },
      },
    },
    '/aduan/{id}/documents/{docId}': {
      delete: {
        tags: ['Aduan'],
        summary: 'Hapus dokumen aduan',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'docId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Dokumen berhasil dihapus' },
          404: { description: 'Dokumen tidak ditemukan' },
        },
      },
    },
    '/aduan/{aduanId}/tindak-lanjut': {
      get: {
        tags: ['Tindak Lanjut'],
        summary: 'Daftar tindak lanjut per aduan',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'aduanId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Daftar tindak lanjut' },
        },
      },
      post: {
        tags: ['Tindak Lanjut'],
        summary: 'Tambah tindak lanjut',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'aduanId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TindakLanjutPayload' },
            },
          },
        },
        responses: {
          201: { description: 'Tindak lanjut berhasil dibuat' },
        },
      },
    },
    '/tindak-lanjut/{id}': {
      put: {
        tags: ['Tindak Lanjut'],
        summary: 'Update tindak lanjut',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TindakLanjutPayload' },
            },
          },
        },
        responses: {
          200: { description: 'Tindak lanjut berhasil diperbarui' },
          400: { description: 'Payload tidak valid' },
          404: { description: 'Tindak lanjut tidak ditemukan' },
        },
      },
      delete: {
        tags: ['Tindak Lanjut'],
        summary: 'Hapus tindak lanjut',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Tindak lanjut berhasil dihapus' },
          404: { description: 'Tindak lanjut tidak ditemukan' },
        },
      },
    },
    '/master/status': {
      get: {
        tags: ['Master'],
        summary: 'Daftar status aduan',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Daftar status' } },
      },
    },
    '/master/kategori': {
      get: {
        tags: ['Master'],
        summary: 'Daftar kategori masalah',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Daftar kategori' } },
      },
    },
    '/master/jenis-tl': {
      get: {
        tags: ['Master'],
        summary: 'Daftar jenis tindak lanjut',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Daftar jenis tindak lanjut' } },
      },
    },
    '/master/kps': {
      get: {
        tags: ['Master'],
        summary: 'Cari data KPS',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Hasil pencarian KPS' } },
      },
    },
    '/master/kps/{id}': {
      get: {
        tags: ['Master'],
        summary: 'Detail KPS',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Detail KPS' },
          404: { description: 'KPS tidak ditemukan' },
        },
      },
    },
    '/master/kps/sync': {
      post: {
        tags: ['Master'],
        summary: 'Sinkronisasi data KPS dari GoKUPS',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Sinkronisasi selesai' },
          403: { description: 'Hanya admin yang dapat menjalankan sync' },
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Daftar user',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Daftar user' } },
      },
      post: {
        tags: ['Users'],
        summary: 'Buat user baru',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUserRequest' },
            },
          },
        },
        responses: {
          201: { description: 'User berhasil dibuat' },
        },
      },
    },
    '/users/{id}': {
      patch: {
        tags: ['Users'],
        summary: 'Update user',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateUserRequest' },
            },
          },
        },
        responses: {
          200: { description: 'User berhasil diperbarui' },
          404: { description: 'User tidak ditemukan' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Hapus user',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'User berhasil dihapus' },
          404: { description: 'User tidak ditemukan' },
        },
      },
    },
    '/dashboard/stats': {
      get: {
        tags: ['Dashboard'],
        summary: 'Statistik dashboard',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Ringkasan statistik dashboard' } },
      },
    },
    '/activities': {
      get: {
        tags: ['Activities'],
        summary: 'Daftar aktivitas',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'aduan_id', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Daftar aktivitas' } },
      },
      post: {
        tags: ['Activities'],
        summary: 'Buat aktivitas baru',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ActivityPayload' },
            },
          },
        },
        responses: {
          201: { description: 'Aktivitas berhasil dibuat' },
        },
      },
    },
    '/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Daftar pengaturan aplikasi',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Daftar pengaturan' } },
      },
    },
    '/settings/{key}': {
      put: {
        tags: ['Settings'],
        summary: 'Update pengaturan aplikasi',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'key', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SettingUpdateRequest' },
            },
          },
        },
        responses: { 200: { description: 'Pengaturan berhasil diperbarui' } },
      },
    },
    '/uploads/{path}': {
      get: {
        tags: ['Uploads'],
        summary: 'Ambil file upload terlindungi',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'path',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Path relatif file upload',
          },
        ],
        responses: {
          200: { description: 'File ditemukan' },
          403: { description: 'Akses file ditolak' },
          404: { description: 'File tidak ditemukan' },
        },
      },
    },
  },
})

const renderSwaggerHtml = (specUrl: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>KITAPANTAUPS API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>`

docs.get('/', (c) => {
  return c.html(renderSwaggerHtml('/docs/openapi.json'))
})

docs.get('/openapi.json', (c) => {
  const origin = new URL(c.req.url).origin
  return c.json(buildOpenApiSpec(origin))
})

export default docs
