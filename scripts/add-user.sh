#!/bin/bash

# VibeNow ITSM User Management Script
# Usage: ./add-user.sh <email> <role> [display_name]
# Example: ./add-user.sh john@external.com admin "John Smith"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required parameters are provided
if [ $# -lt 2 ]; then
    print_error "Usage: $0 <email> <role> [display_name]"
    print_error "Roles: admin, user, moderator"
    print_error "Example: $0 john@external.com admin \"John Smith\""
    exit 1
fi

EMAIL="$1"
ROLE="$2"
DISPLAY_NAME="${3:-$EMAIL}"

# Validate role
if [[ ! "$ROLE" =~ ^(admin|user|moderator)$ ]]; then
    print_error "Invalid role: $ROLE"
    print_error "Valid roles: admin, user, moderator"
    exit 1
fi

# Validate email format
if [[ ! "$EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
    print_error "Invalid email format: $EMAIL"
    exit 1
fi

print_status "Adding user: $EMAIL with role: $ROLE"

# Check if user is already in the tenant
print_status "Checking if user exists in tenant..."

# Try to find user by email (works for internal users)
USER_EXISTS=$(az ad user list --filter "mail eq '$EMAIL' or userPrincipalName eq '$EMAIL'" --query "length([*])" --output tsv 2>/dev/null || echo "0")

# Also check guest users (external email addresses)
if [ "$USER_EXISTS" -eq 0 ]; then
    # Convert email to guest UPN format for external users
    GUEST_UPN=$(echo "$EMAIL" | sed 's/@/_/g' | sed 's/\./_/g')
    GUEST_UPN_FULL="${GUEST_UPN}#EXT#@$(az account show --query 'tenantId' -o tsv | xargs az ad signed-in-user show --query 'userPrincipalName' -o tsv | cut -d'@' -f2)"
    
    USER_EXISTS=$(az ad user list --filter "userPrincipalName eq '$GUEST_UPN_FULL'" --query "length([*])" --output tsv 2>/dev/null || echo "0")
    
    if [ "$USER_EXISTS" -gt 0 ]; then
        print_success "User found as guest: $GUEST_UPN_FULL"
        USER_PRINCIPAL_NAME="$GUEST_UPN_FULL"
        USER_OBJECT_ID=$(az ad user show --id "$GUEST_UPN_FULL" --query "id" --output tsv)
    fi
fi

# If user exists as internal user
if [ "$USER_EXISTS" -gt 0 ] && [ -z "$USER_PRINCIPAL_NAME" ]; then
    print_success "User found in tenant: $EMAIL"
    USER_OBJECT_ID=$(az ad user show --id "$EMAIL" --query "id" --output tsv)
    USER_PRINCIPAL_NAME="$EMAIL"
fi

# If user doesn't exist, invite them as guest
if [ "$USER_EXISTS" -eq 0 ]; then
    print_status "User not found in tenant. Sending B2B guest invitation..."
    
    # Create invitation body for Microsoft Graph API
    INVITATION_BODY=$(cat <<EOF
{
    "invitedUserEmailAddress": "$EMAIL",
    "invitedUserDisplayName": "$DISPLAY_NAME",
    "inviteRedirectUrl": "https://green-smoke-0db3ad503.3.azurestaticapps.net",
    "sendInvitationMessage": true,
    "invitedUserMessageInfo": {
        "customizedMessageBody": "Welcome to VibeNow ITSM! You have been granted $ROLE access to our IT Service Management system."
    }
}
EOF
)
    
    INVITATION_RESULT=$(az rest --method POST \
        --url "https://graph.microsoft.com/v1.0/invitations" \
        --body "$INVITATION_BODY" \
        --headers "Content-Type=application/json" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        USER_OBJECT_ID=$(echo "$INVITATION_RESULT" | jq -r '.invitedUser.id')
        USER_PRINCIPAL_NAME=$(echo "$INVITATION_RESULT" | jq -r '.invitedUser.userPrincipalName')
        REDEEM_URL=$(echo "$INVITATION_RESULT" | jq -r '.inviteRedeemUrl')
        
        print_success "B2B invitation sent successfully!"
        print_status "User Object ID: $USER_OBJECT_ID"
        print_status "User Principal Name: $USER_PRINCIPAL_NAME"
        print_warning "Invitation email sent to: $EMAIL"
        print_status "Redemption URL: $REDEEM_URL"
    else
        print_error "Failed to send B2B invitation via Microsoft Graph API"
        exit 1
    fi
else
    print_success "Using existing user with Object ID: $USER_OBJECT_ID"
fi

# Add role to database
print_status "Adding role to database..."

ASSIGNED_BY=$(az account show --query 'user.name' --output tsv 2>/dev/null || echo "script")

# Create SQL command to add user role
SQL_COMMAND="
IF EXISTS (SELECT 1 FROM UserRoles WHERE UserEmail = '$EMAIL' AND RoleName = '$ROLE')
BEGIN
    PRINT 'User $EMAIL already has $ROLE role'
END
ELSE
BEGIN
    INSERT INTO UserRoles (UserEmail, UserObjectID, RoleName, AssignedBy) 
    VALUES ('$EMAIL', '$USER_OBJECT_ID', '$ROLE', '$ASSIGNED_BY')
    PRINT 'Added $ROLE role for $EMAIL'
END

-- Show current roles for this user
SELECT UserEmail, RoleName, AssignedBy, AssignedDate, IsActive 
FROM UserRoles 
WHERE UserEmail = '$EMAIL' OR UserObjectID = '$USER_OBJECT_ID'
ORDER BY AssignedDate DESC
"

# Execute SQL command
print_status "Executing database command..."
sqlcmd -S vibenow.database.windows.net -d "VibeNow-Test" -G -l 30 -Q "$SQL_COMMAND"

if [ $? -eq 0 ]; then
    print_success "Database role assignment completed!"
else
    print_error "Failed to assign role in database"
    exit 1
fi

# Summary
echo
print_success "=== USER SETUP COMPLETE ==="
print_status "Email: $EMAIL"
print_status "Role: $ROLE"
print_status "Display Name: $DISPLAY_NAME"
print_status "Object ID: $USER_OBJECT_ID"
print_status "Principal Name: $USER_PRINCIPAL_NAME"

if [ -n "$REDEEM_URL" ]; then
    echo
    print_warning "=== NEXT STEPS ==="
    print_warning "1. Send this invitation link to $EMAIL:"
    print_warning "   $REDEEM_URL"
    print_warning "2. User must click the link to accept the invitation"
    print_warning "3. User can then access the app at: https://green-smoke-0db3ad503.3.azurestaticapps.net"
else
    echo
    print_success "User can now access the app at: https://green-smoke-0db3ad503.3.azurestaticapps.net"
fi

echo