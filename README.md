# Social News Backend API

A comprehensive Node.js/Express backend for the Social News platform with admin panel, user management, and student dashboard functionality.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Student, User)
- Secure password hashing with bcryptjs

### 👥 Admin Panel APIs
- **Dashboard Analytics** - User stats, campaign metrics, donation tracking
- **User Management** - CRUD operations for users with filtering
- **Campaign Management** - Create, update, and manage campaigns
- **Task & Quiz Management** - Create assignments and educational content
- **Media Management** - File upload and management system
- **Submission Review** - Approve/reject task submissions
- **Certificate Management** - Issue and track certificates
- **Banner Management** - Advertisement and promotional content
- **Donation Tracking** - Monitor and manage donations
- **Enquiry Management** - Handle user support requests
- **Content Management** - CMS for website content
- **Reports & Analytics** - Comprehensive reporting dashboard

### 🎓 Student/User Panel APIs
- **Profile Management** - Update personal information
- **Campaign Registration** - Join active campaigns
- **Task Management** - View assignments and submit completions
- **Quiz Participation** - Take quizzes and track scores
- **Progress Tracking** - Monitor learning progress and achievements
- **Certificate Downloads** - Access earned certificates
- **ID Card Generation** - Generate student ID cards with QR codes
- **Marketplace** - Browse and purchase products
- **Donation System** - Make donations to campaigns
- **Notifications** - Receive updates and announcements
- **Activity History** - Track all user activities

## Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL database
- Environment variables configured

### Installation

1. **Clone and install dependencies:**
```bash
cd /Users/hemanthkancharla/socialnewsbe
npm install
```

2. **Setup environment variables (.env):**
```bash
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
ADMIN_EMAIL=admin@socialnews.org
ADMIN_PASSWORD=Admin@social123
PORT=5000
```

3. **Initialize database:**
```bash
npm run setup
```

4. **Start the server:**
```bash
npm start
# or for development
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/admin-login` - Admin login
- `GET /api/auth/me` - Get current user info
- `PUT /api/auth/profile` - Update user profile

### Admin Routes (Requires Admin Token)
- `GET /api/admin/dashboard` - Analytics dashboard
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/campaigns` - List campaigns
- `POST /api/admin/campaigns` - Create campaign
- `PUT /api/admin/campaigns/:id` - Update campaign
- `GET /api/admin/tasks` - List tasks
- `POST /api/admin/tasks` - Create task
- `GET /api/admin/quizzes` - List quizzes
- `POST /api/admin/quizzes` - Create quiz
- `GET /api/admin/submissions` - Review submissions
- `PUT /api/admin/submissions/:id/approve` - Approve submission
- `PUT /api/admin/submissions/:id/reject` - Reject submission
- `GET /api/admin/marketplace` - Manage products
- `POST /api/admin/marketplace` - Add product
- `GET /api/admin/certificates` - List certificates
- `GET /api/admin/banners` - Manage banners
- `POST /api/admin/banners` - Create banner
- `GET /api/admin/donations` - View donations
- `GET /api/admin/enquiries` - Handle enquiries
- `PUT /api/admin/enquiries/:id` - Update enquiry status
- `GET /api/admin/content` - CMS content
- `PUT /api/admin/content/:key` - Update content
- `GET /api/admin/reports` - Generate reports

### Student/User Routes (Requires User Token)
- `GET /api/student/dashboard` - Student dashboard data
- `PUT /api/student/profile` - Update profile
- `GET /api/student/campaigns` - Available campaigns
- `POST /api/student/campaigns/:id/register` - Register for campaign
- `GET /api/student/tasks` - Assigned tasks
- `POST /api/student/tasks/:id/submit` - Submit task (with file upload)
- `GET /api/student/quizzes` - Available quizzes
- `GET /api/student/quizzes/:id` - Quiz details
- `POST /api/student/quizzes/:id/participate` - Submit quiz answers
- `GET /api/student/progress` - Progress tracking
- `GET /api/student/certificates` - User certificates
- `GET /api/student/id-card` - Generate ID card data
- `GET /api/student/marketplace` - Browse products
- `POST /api/student/marketplace/order` - Place order
- `GET /api/student/donations/history` - Donation history
- `GET /api/student/notifications` - User notifications
- `PUT /api/student/notifications/:id/read` - Mark as read
- `POST /api/student/enquiry` - Submit enquiry
- `GET /api/student/activity` - Activity history

### Public Routes
- `GET /api/campaigns` - Public campaigns
- `GET /api/campaigns/:id` - Campaign details
- `GET /api/tasks` - Public tasks
- `GET /api/tasks/:id` - Task details
- `GET /api/quizzes` - Public quizzes
- `GET /api/marketplace` - Public marketplace
- `GET /api/donations/campaigns` - Donation campaigns
- `POST /api/donations/donate` - Make donation
- `POST /api/enquiries` - Submit enquiry
- `GET /api/content` - Website content
- `GET /api/content/:key` - Specific content section

### Media & File Upload
- `POST /api/media/upload` - Upload files (images, documents)

## Database Schema

The system uses PostgreSQL with the following main tables:
- `users` - User accounts and profiles
- `admins` - Admin accounts
- `campaigns` - Social campaigns
- `tasks` - Educational tasks
- `task_assignments` - Task submissions and approvals
- `quizzes` - Quiz content and questions
- `quiz_attempts` - User quiz attempts and scores
- `certificates` - Issued certificates
- `products` - Marketplace items
- `orders` - Purchase orders
- `donations` - Donation records
- `notifications` - User notifications
- `enquiries` - Support requests
- `banners` - Advertisement content
- `cms_sections` - Website content management
- `activity_logs` - User activity tracking

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in requests:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `500` - Internal Server Error

## File Upload

The API supports file uploads for:
- Task submissions (images)
- User avatars
- Campaign images
- Product images
- Banner images

Files are stored in the `/uploads` directory with size limits and type validation.

## Development

For development, the server includes:
- CORS enabled for frontend integration
- Detailed error logging
- Database connection monitoring
- Hot reload capability

## Security Features

- Password hashing with bcryptjs
- JWT token expiration (7 days)
- Role-based access control
- SQL injection prevention with parameterized queries
- File upload type and size validation
- CORS configuration

## API Testing

Use tools like Postman or curl to test endpoints:

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```