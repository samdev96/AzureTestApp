# VibeNow ITSM - Deployment Guide

## 🎯 Overview
Complete setup guide for deploying VibeNow ITSM system with Azure SQL Database and Azure Functions.

## ✅ Prerequisites Completed
- ✅ Azure SQL Database created (VibeNow-Test)
- ✅ Database networking configured
- ✅ System assigned managed identity enabled
- ✅ Azure AD authentication configured

## 📋 Step-by-Step Deployment

### Step 1: Create Database Schema
1. Go to Azure Portal → Your SQL Database (VibeNow-Test)
2. Click **Query editor**
3. Sign in with your Azure AD account
4. Copy and paste the contents of `/database/schema.sql`
5. Click **Run** to create all tables and data

### Step 2: Install Azure Functions Dependencies
```bash
cd /Users/samduffy/AzureDev/AzureTestApp/api
npm install
```

### Step 3: Test Azure Functions Locally
```bash
# In the api directory
npm start
```
This will start the Functions runtime on http://localhost:7071

### Step 4: Test API Endpoints Locally
```bash
# Test GET incidents
curl http://localhost:7071/api/incidents

# Test POST incident
curl -X POST http://localhost:7071/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Incident",
    "description": "Test description",
    "category": "Software",
    "priority": "Medium",
    "affectedUser": "Test User",
    "contactInfo": "test@example.com"
  }'
```

### Step 5: Deploy to Azure Static Web Apps
You have two options:

#### Option A: Via Azure Portal
1. Create Azure Static Web App resource
2. Connect to your GitHub repository
3. Set build configuration:
   - App location: `/`
   - Api location: `/api`
   - Output location: `build`

#### Option B: Via Azure CLI
```bash
# Install Azure CLI (if not installed)
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login to Azure
az login

# Create resource group (if not exists)
az group create --name VibeNow --location "UK South"

# Create Static Web App
az staticwebapp create \
  --name vibenow-app \
  --resource-group VibeNow \
  --source https://github.com/YOUR_USERNAME/YOUR_REPO \
  --location "UK South" \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "build"
```

### Step 6: Configure Static Web App Settings
In Azure Portal → Your Static Web App → Configuration, add:

```
SQLCONNSTR_DefaultConnection = Server=tcp:vibenow.database.windows.net,1433;Database=VibeNow-Test;Authentication=Active Directory Default;Encrypt=true;TrustServerCertificate=false;
```

### Step 7: Enable Managed Identity for Static Web App
1. Go to Static Web App → Identity
2. Enable System assigned managed identity
3. Note the Object ID

### Step 8: Grant Database Permissions
Run this in your SQL Database Query Editor:
```sql
-- Replace 'your-staticwebapp-identity' with the actual identity name
CREATE USER [vibenow-app] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [vibenow-app];
ALTER ROLE db_datawriter ADD MEMBER [vibenow-app];
```

## 🧪 Testing the Complete System

### Frontend Tests
1. Visit your deployed Static Web App URL
2. Test creating incidents: Home → Create Incident → Fill form → Submit
3. Test creating requests: Home → Create Request → Fill form → Submit  
4. Test viewing tickets: Home → View Tickets → See your created tickets

### API Tests
Replace `YOUR_STATIC_WEB_APP_URL` with your actual URL:
```bash
# Test deployed API
curl https://YOUR_STATIC_WEB_APP_URL/api/incidents
curl https://YOUR_STATIC_WEB_APP_URL/api/requests
```

## 🔧 Troubleshooting

### Common Issues

**Database Connection Issues:**
- Verify managed identity is enabled
- Check database firewall allows Azure services
- Confirm connection string is correct

**API Authentication Issues:**
- Ensure Static Web App has system managed identity
- Verify database user is created for the identity
- Check database permissions are granted

**CORS Issues:**
- Verify API functions include CORS headers
- Check browser developer tools for CORS errors

**Build Issues:**
- Ensure all npm dependencies are installed
- Check TypeScript compilation errors
- Verify API routes are correctly configured

### Useful Commands

```bash
# Check Azure Functions logs
az staticwebapp logs show --name vibenow-app --resource-group VibeNow

# Test database connectivity
sqlcmd -S vibenow.database.windows.net -d VibeNow-Test -G

# View Static Web App configuration
az staticwebapp show --name vibenow-app --resource-group VibeNow
```

## 🎉 Success Criteria

Your VibeNow ITSM system is successfully deployed when:
- ✅ Database schema is created with sample data
- ✅ Azure Functions are running and accessible
- ✅ React app loads and navigates properly
- ✅ Incident creation works and saves to database
- ✅ Request creation works and saves to database
- ✅ View Tickets page displays real data from database
- ✅ All forms show proper validation and error handling

## 🚀 Next Steps (Optional Enhancements)
- Add user authentication with Azure AD B2C
- Implement ticket status updates and assignments
- Add email notifications for ticket creation/updates
- Create admin dashboard for ticket management
- Add file attachments to tickets
- Implement approval workflows for requests