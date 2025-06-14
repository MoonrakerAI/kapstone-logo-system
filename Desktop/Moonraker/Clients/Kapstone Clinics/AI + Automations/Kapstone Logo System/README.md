# Kapstone Logo Distribution System

A centralized logo distribution system for ketamine-assisted psychotherapy clinics verified by Kapstone Clinics Directory.

## Features

- **Automated Clinic Registration**: Clinics can register and receive unique IDs automatically
- **Central Logo Management**: Control logo distribution from a single dashboard
- **SEO-Friendly Embeds**: Generate quality backlinks to the main directory
- **Domain Verification**: Ensure logos only appear on authorized domains
- **Analytics Tracking**: Monitor logo impressions and usage
- **Admin Dashboard**: Approve/reject applications and manage clinics

## How It Works

1. **Clinic Registration**: Clinics apply through the registration form
2. **Admin Review**: Applications are reviewed for quality standards
3. **Approval**: Approved clinics receive API keys and embed codes
4. **Logo Display**: Clinics embed JavaScript widget on their websites
5. **Analytics**: Track impressions and generate reports

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start MongoDB (if using local)
mongod

# Start the server
npm run dev
```

### Usage

#### For Clinics

1. Visit the registration form: `/register.html`
2. Fill out the application form
3. Wait for approval (3-5 business days)
4. Once approved, add the embed code to your website:

```html
<script src="https://api.kapstoneclinics.com/widget/logo/YOUR-CLINIC-ID"></script>
```

#### For Administrators

1. Access the admin dashboard: `/admin/`
2. Default credentials: `admin` / `admin123` (change in production!)
3. Review and approve/reject applications
4. Monitor analytics and manage clinics

## API Endpoints

### Public Endpoints

- `POST /api/clinics/register` - Register new clinic
- `GET /api/clinics/:clinicId/status` - Check clinic status
- `GET /widget/logo/:clinicId` - Load logo widget

### Admin Endpoints

- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/clinics` - List all clinics
- `PATCH /api/admin/clinics/:clinicId/status` - Update clinic status
- `GET /api/admin/analytics` - Get analytics data

## Deployment

### Production Setup

1. **Environment Variables**: Update `.env` with production values
2. **Database**: Set up MongoDB Atlas or similar
3. **Email Service**: Configure SendGrid or AWS SES
4. **Logo Storage**: Add logo files to `/public/logos/`
5. **SSL**: Ensure HTTPS is configured
6. **Domain**: Point your domains to the server

### Docker Deployment

```bash
# Build image
docker build -t kapstone-logos .

# Run container
docker run -p 3000:3000 --env-file .env kapstone-logos
```

### Security Considerations

- Change default admin credentials
- Use strong JWT secrets
- Enable rate limiting
- Implement domain verification
- Use HTTPS in production
- Regular security updates

## Logo Widget Features

The embedded widget provides:

- **Responsive Design**: Works on all screen sizes
- **SEO Optimization**: Includes proper backlinks
- **Verification Badge**: Shows clinic is verified
- **Analytics Tracking**: Counts impressions
- **Domain Protection**: Only works on approved domains

## Customization

### Logo Versions

Different logo versions can be assigned to clinics:
- `standard` - Default logo
- `premium` - Enhanced logo for premium clinics
- `custom` - Custom branded versions

### Styling

The widget can be customized with CSS:

```css
.kapstone-verified-badge {
  /* Your custom styles */
}
```

## Support

For technical support or questions, contact the development team.

## License

Proprietary - Kapstone Clinics Directory System