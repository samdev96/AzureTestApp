# VibeNow ITSM User Management

This directory contains utilities for managing users in the VibeNow ITSM system.

## Overview

The user management system handles:
- **Authentication**: Azure AD (Entra ID) with B2B guest user support
- **Authorization**: Database-based role assignment
- **Automated Setup**: Scripts to invite users and assign roles

## Available Scripts

### 1. Shell Script (Linux/macOS)
```bash
./add-user.sh <email> <role> [display_name]
```

### 2. Node.js Script (Cross-platform)
```bash
node add-user.js <email> <role> [display_name]
```

## Prerequisites

### Required Tools
- **Azure CLI**: `az` command must be installed and authenticated
- **sqlcmd**: For database operations (install via `brew install sqlcmd` on macOS)
- **jq**: JSON processor (for shell script only)
- **Node.js**: Version 14+ (for Node.js script)

### Authentication Setup
```bash
# Login to Azure
az login

# Verify you're in the correct tenant
az account show

# Test database connection
sqlcmd -S vibenow.database.windows.net -d "VibeNow-Test" -G -Q "SELECT GETDATE()"
```

## Usage Examples

### Add an admin user
```bash
# Shell script
./add-user.sh john@external.com admin "John Smith"

# Node.js script
node add-user.js john@external.com admin "John Smith"
```

### Add a regular user
```bash
./add-user.sh jane@company.com user "Jane Doe"
```

### Add a moderator
```bash
./add-user.sh support@partner.org moderator "Support Team"
```

## Available Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | Full administrative access | View all tickets, manage system |
| `user` | Standard user access | View own tickets, create tickets |
| `moderator` | Limited administrative access | View team tickets, moderate content |

## How It Works

### For New Users (External Email)
1. **Checks** if user exists in Entra ID tenant
2. **Invites** user as B2B guest if not found
3. **Assigns** role in database
4. **Sends** invitation email to user
5. **User** must accept invitation to access the app

### For Existing Users (Internal or Already Invited)
1. **Finds** existing user in tenant
2. **Assigns** role in database (if not already assigned)
3. **User** can immediately access with new permissions

## Database Schema

The system uses a `UserRoles` table:
```sql
CREATE TABLE UserRoles (
    UserRoleID int IDENTITY(1,1) PRIMARY KEY,
    UserEmail nvarchar(255) NOT NULL,
    UserObjectID nvarchar(50) NULL,
    RoleName nvarchar(50) NOT NULL,
    AssignedBy nvarchar(255) NOT NULL,
    AssignedDate datetime2 DEFAULT GETDATE(),
    IsActive bit DEFAULT 1
);
```

## Manual Database Operations

### View all user roles
```sql
SELECT * FROM UserRoles WHERE IsActive = 1 ORDER BY AssignedDate DESC;
```

### Remove a user's role
```sql
UPDATE UserRoles 
SET IsActive = 0 
WHERE UserEmail = 'user@example.com' AND RoleName = 'admin';
```

### Add role manually
```sql
INSERT INTO UserRoles (UserEmail, RoleName, AssignedBy) 
VALUES ('user@example.com', 'admin', 'admin@company.com');
```

## Troubleshooting

### "User not found" errors
- Ensure Azure CLI is logged in: `az account show`
- Check you have permissions to invite guests
- Verify email address format

### Database connection errors
- Test sqlcmd connection manually
- Ensure you have Azure SQL access permissions
- Check firewall rules

### Permission errors
- Verify you have Guest Inviter role in Entra ID
- Check SQL database permissions
- Ensure you're in the correct Azure subscription

### B2B invitation issues
- User must check email (including spam folder)
- Invitation links expire after 30 days
- Some organizations block external invitations

## Security Considerations

- Scripts require admin-level access to Azure AD and SQL Database
- All role assignments are audited in the database
- B2B guests are external users - review security policies
- Scripts should be run by authorized administrators only

## App Access

After successful setup, users can access the app at:
**https://green-smoke-0db3ad503.3.azurestaticapps.net**

## Support

For issues with user management:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Test individual components (Azure CLI, sqlcmd, permissions)
4. Check Azure AD and database logs