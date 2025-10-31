# Employee Reporting System

A comprehensive full-stack employee reporting system for market data collection with GPS tracking, media uploads, and real-time monitoring.

## 🚀 Features

### Employee Features
- **Secure Authentication**: JWT-based login with email/password
- **Market Selection**: Choose market location and create daily sessions
- **Punch In/Out**: Server-side timestamp tracking
- **Stall Management**: Add, edit, and remove stall confirmations (farmer name, stall name, stall number)
- **Time-Restricted Media Uploads**:
  - Outside Market Rates: 2:00 PM - 2:15 PM IST (images/video/audio)
  - Selfie + GPS: 2:15 PM - 2:20 PM IST (automatic GPS capture)
- **Finalization**: Lock reports before 11:00 AM IST

### Admin Features
- **Dashboard Overview**: Real-time statistics and metrics
- **Session Management**: View all employee sessions with advanced filtering
- **GPS Integration**: View location data on Google Maps
- **CSV Export**: Export session data for analysis
- **Comment System**: Add administrative notes to sessions
- **User Management**: Grant/revoke admin roles

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Lovable Cloud (PostgreSQL + Edge Functions + Storage)
- **Authentication**: JWT with HTTP-only cookies
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **File Storage**: S3-style storage with presigned URLs
- **Maps**: Google Maps integration for GPS data

## 📊 Database Schema

- **profiles**: User profile information
- **user_roles**: Role-based access control (employee/admin)
- **markets**: Market locations
- **sessions**: Daily reporting sessions
- **stalls**: Stall confirmation records
- **media**: Uploaded files with GPS metadata
- **comments**: Admin comments on sessions

## 🔒 Security Features

- Row-Level Security (RLS) policies on all tables
- JWT authentication with secure session management
- Role-based access control (RBAC)
- Secure file storage with user-specific access
- Input validation and sanitization
- Time-window enforcement for sensitive operations

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:8080`

### First Time Setup

1. Create an account using the signup form
2. The first user can be manually granted admin role via the backend
3. Admins can then grant admin access to other users via the User Management page

## 📱 Usage

### For Employees

1. **Login**: Access the system with your credentials
2. **Start Session**: Select your market for the day
3. **Punch In**: Record your start time
4. **Add Stalls**: Document all stall confirmations
5. **Upload Media**: 
   - Outside rates between 2:00-2:15 PM IST
   - Selfie with GPS between 2:15-2:20 PM IST
6. **Finalize**: Complete your report before 11:00 AM IST

### For Admins

1. **View Dashboard**: Monitor system-wide metrics
2. **Browse Sessions**: Filter and search all employee sessions
3. **Review Details**: View stalls, media, GPS locations
4. **Add Comments**: Provide feedback on sessions
5. **Export Data**: Download CSV reports
6. **Manage Users**: Grant/revoke admin privileges

## 🌐 Deployment

This project is built with Lovable and can be deployed with one click:

1. Click "Publish" in the Lovable editor
2. Your app will be deployed to a production URL
3. Optionally connect a custom domain in Project Settings

## 📄 API Endpoints

The system uses Lovable Cloud with automatic API generation. Key operations:

- Authentication: `/auth/*`
- Sessions: CRUD operations on sessions table
- Stalls: CRUD operations on stalls table
- Media: File uploads with metadata
- Admin: Session queries and user management

## 🔧 Configuration

### Time Windows (IST)
- Outside Market Rates Upload: 14:00 - 14:15
- Selfie + GPS Upload: 14:15 - 14:20
- Finalization Deadline: Before 11:00

### File Storage
- Bucket: `employee-media`
- Access: User-specific with admin override
- Supported formats: Images, videos, audio files

## 📝 Environment Variables

Environment variables are automatically managed by Lovable Cloud:
- `VITE_SUPABASE_URL`: Backend API URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Public API key
- Storage and auth configured automatically

## 🤝 Contributing

This is a production system. Contact the system administrator for contribution guidelines.

## 📧 Support

For technical support or questions, contact your system administrator.

## 📜 License

Proprietary - All rights reserved

---

Built with [Lovable](https://lovable.dev) - The AI-powered full-stack development platform
