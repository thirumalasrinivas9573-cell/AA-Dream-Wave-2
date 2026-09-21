# DREAM WAVE AI - Setup Guide

## 🚀 Quick Setup Instructions

### Step 1: Install Dependencies

```bash
# Backend Dependencies
cd server
npm install

# Frontend Dependencies  
cd ../client
npm install
```


### Step 2: Environment Configuration

Create `.env` file in `server/` directory:

```env
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/dreamwave
JWT_SECRET=your_jwt_secret_key_here
OPENAI_API_KEY=your_openai_api_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
PORT=5000
```

### Step 3: Start Development Servers

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend  
cd client
npm run dev
```

Access the app at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 📋 Required Services

1. **MongoDB Atlas** - Create free cluster
2. **OpenAI API** - Get API key from platform.openai.com
3. **Firebase** - For file storage (optional for development)

## 🔧 Common Issues & Solutions

### MongoDB Connection Error
- Check MongoDB URL format
- Ensure IP address is whitelisted in Atlas
- Verify cluster is running

### OpenAI API Error  
- Verify API key is valid
- Check API key has credits
- Ensure correct key format

### Frontend Not Loading
- Ensure backend is running on port 5000
- Check CORS configuration
- Verify API endpoints are accessible

## 🌐 Production Deployment

### Render.com Deployment

1. **Backend Service**
   - Repository: Connect GitHub
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Environment Variables: Add all from `.env`

2. **Frontend Service**
   - Build Command: `cd client && npm install && npm run build`
   - Publish Directory: `client/dist`
   - Environment Variable: `VITE_API_URL=https://your-backend-url.onrender.com`

### Environment Variables for Production

```env
# Backend
MONGODB_URL=your_production_mongodb_url
JWT_SECRET=your_production_jwt_secret
OPENAI_API_KEY=your_production_openai_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
PORT=5000

# Frontend  
VITE_API_URL=https://your-backend-url.onrender.com
```

## 🎯 Testing the Application

### Test Authentication
1. Navigate to `/signup`
2. Create a new account
3. Verify login works
4. Check AAID login functionality

### Test AI Features
1. Create a goal in `/goals`
2. Generate R&D report in `/reports`
3. Test roadmap generation
4. Try mentor mode with Krishna AI

### Test Social Features
1. Create a community post
2. Add comments and likes
3. Test friend system
4. Update profile picture

## 📱 Mobile Responsiveness

The application is fully responsive and works on:
- Desktop (1200px+)
- Tablet (768px-1199px)
- Mobile (320px-767px)

## 🔒 Security Notes

- Change default JWT secret in production
- Use HTTPS in production
- Enable rate limiting on API endpoints
- Validate all user inputs
- Secure file uploads

## 🚀 Performance Optimization

- Enable gzip compression
- Use CDN for static assets
- Implement caching strategies
- Optimize database queries
- Use lazy loading for components

## 📞 Support

For setup issues:
1. Check this guide first
2. Review error messages in console
3. Verify environment variables
4. Check network connectivity
5. Create GitHub issue if needed

---

**Happy Coding! 🎉**
