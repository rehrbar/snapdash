# Storage Configuration

SnapDash now uses S3-compatible storage (SeaweedFS) for file management instead of primitive filesystem storage.

## Architecture

- **Storage Backend**: SeaweedFS (S3-compatible object storage)
- **S3 Client**: AWS SDK for JavaScript v3
- **Implementation**: Direct S3 storage only

## SeaweedFS Configuration

SeaweedFS is configured in `docker-compose.yml` with:
- **S3 API Port**: 8333 (exposed to host)
- **Master Server Port**: 9333 (for cluster status)
- **Filer Port**: 8888 (for file operations)
- **Data Volume**: `seaweedfs-data`
- **Config Volume**: `./seaweedfs-config`

### S3 Credentials

The S3 credentials are configured in `seaweedfs-config/s3.json`:
- **Access Key**: `snapdash-access-key`
- **Secret Key**: `snapdash-secret-key`
- **Permissions**: Admin, Read, Write

## Environment Variables

Configure storage in `server/.env`:

```env
# S3 Storage Configuration
S3_ENDPOINT=http://seaweedfs:8333  # SeaweedFS endpoint (or MinIO, AWS S3, etc.)
S3_REGION=us-east-1                # AWS region (required even for non-AWS S3)
S3_ACCESS_KEY=snapdash-access-key  # S3 access key
S3_SECRET_KEY=snapdash-secret-key  # S3 secret key
S3_BUCKET=snapdash-projects        # Bucket name for project files
```

## File Organization

In S3 storage, files are organized by project folder prefix:
```
snapdash-projects/
├── project-abc123/
│   ├── index.html
│   ├── styles.css
│   └── images/
│       └── logo.png
└── project-xyz789/
    └── index.html
```

## File Access API

The `fileAccessService` provides S3 storage operations:
- `readFile(project, filePath)` - Read text files
- `writeFile(project, filePath, content)` - Write text files
- `writeBinaryFile(project, filePath, buffer)` - Write binary files
- `deleteFile(project, filePath)` - Delete files
- `createReadStream(project, filePath)` - Stream files
- `listFiles(project)` - List all files in a project
- `fileExists(project, filePath)` - Check file existence
- All operations include path security validation

## Development

### Local Development
1. Start SeaweedFS: `docker-compose up seaweedfs`
2. Configure `.env` with S3 settings (see `.env.example`)
3. Run server: `cd server && npm start`

## Production Deployment

For production, you can use:
1. **SeaweedFS** (included in docker-compose)
2. **MinIO** (alternative S3-compatible storage)
3. **AWS S3** (managed cloud storage)
4. **Any S3-compatible storage** (change `S3_ENDPOINT`)

### Using AWS S3
```env
STORAGE_TYPE=s3
S3_ENDPOINT=                    # Leave empty for AWS S3
S3_REGION=us-west-2             # Your AWS region
S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET=my-snapdash-production
```

## Security

- Path traversal protection prevents accessing files outside project folders
- S3 credentials should be kept secure and rotated regularly
- SeaweedFS access is restricted by S3 identity configuration
- All file operations validate paths before execution

## Monitoring

SeaweedFS provides a web UI for monitoring:
- **Master UI**: http://localhost:9333
- **Filer UI**: http://localhost:8888

Check cluster status:
```bash
curl http://localhost:9333/cluster/status
```

## Troubleshooting

### Connection Refused
If the server can't connect to SeaweedFS:
1. Verify SeaweedFS is running: `docker-compose ps seaweedfs`
2. Check S3_ENDPOINT matches the service name in docker-compose
3. Ensure seaweedfs service started before the server

### Files Not Found
1. Check bucket name matches `S3_BUCKET` environment variable
2. Verify S3 credentials are correct
3. Check SeaweedFS logs: `docker-compose logs seaweedfs`

### Performance Issues
1. SeaweedFS stores data in `/data` volume - ensure sufficient disk space
2. Consider using SSD storage for better performance
3. Monitor SeaweedFS metrics at http://localhost:9333

## Data Migration

If migrating from a previous filesystem-based installation:

1. Create a migration script that reads files from `data/{project-folder}/` and uploads to S3
2. Use the `fileAccessService` functions (`writeFile`, `writeBinaryFile`) to upload files
3. Verify all files are accessible via the API
4. Remove old filesystem data after successful migration
