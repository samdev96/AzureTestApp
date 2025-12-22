#!/usr/bin/env node

/**
 * VibeNow ITSM User Management Utility
 * 
 * Usage: node add-user.js <email> <role> [displayName]
 * Example: node add-user.js john@external.com admin "John Smith"
 */

const { execSync } = require('child_process');
const chalk = require('chalk');

// Color functions
const info = (msg) => console.log(chalk.blue('[INFO]'), msg);
const success = (msg) => console.log(chalk.green('[SUCCESS]'), msg);
const warning = (msg) => console.log(chalk.yellow('[WARNING]'), msg);
const error = (msg) => console.log(chalk.red('[ERROR]'), msg);

// Validate command line arguments
const [,, email, role, displayName] = process.argv;

if (!email || !role) {
    error('Usage: node add-user.js <email> <role> [displayName]');
    error('Roles: agent, user, moderator');
    error('Example: node add-user.js john@external.com agent "John Smith"');
    process.exit(1);
}

// Validate role
const validRoles = ['agent', 'user', 'moderator'];
if (!validRoles.includes(role)) {
    error(`Invalid role: ${role}`);
    error(`Valid roles: ${validRoles.join(', ')}`);
    process.exit(1);
}

// Validate email format
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
if (!emailRegex.test(email)) {
    error(`Invalid email format: ${email}`);
    process.exit(1);
}

const userDisplayName = displayName || email;

async function runCommand(command, description) {
    try {
        info(description);
        const result = execSync(command, { 
            encoding: 'utf-8', 
            stdio: ['pipe', 'pipe', 'pipe'] 
        });
        return result.trim();
    } catch (err) {
        error(`Failed: ${description}`);
        if (err.stderr) {
            error(err.stderr.toString());
        }
        throw err;
    }
}

async function addUser() {
    try {
        info(`Adding user: ${email} with role: ${role}`);

        // Check if user exists in tenant
        info('Checking if user exists in tenant...');
        
        let userExists = 0;
        let userObjectId = '';
        let userPrincipalName = '';

        // Check for internal users
        try {
            const internalCheck = await runCommand(
                `az ad user list --filter "mail eq '${email}' or userPrincipalName eq '${email}'" --query "length([*])" --output tsv`,
                'Checking for internal users'
            );
            userExists = parseInt(internalCheck) || 0;

            if (userExists > 0) {
                userObjectId = await runCommand(
                    `az ad user show --id "${email}" --query "id" --output tsv`,
                    'Getting user object ID'
                );
                userPrincipalName = email;
                success(`User found in tenant: ${email}`);
            }
        } catch (err) {
            // Continue to check guest users
        }

        // Check for guest users if not found as internal user
        if (userExists === 0) {
            try {
                const domain = await runCommand(
                    `az account show --query 'tenantId' -o tsv | xargs az ad signed-in-user show --query 'userPrincipalName' -o tsv | cut -d'@' -f2`,
                    'Getting tenant domain'
                );
                
                const guestUpn = email.replace(/@/g, '_').replace(/\./g, '_') + '#EXT#@' + domain;
                
                const guestCheck = await runCommand(
                    `az ad user list --filter "userPrincipalName eq '${guestUpn}'" --query "length([*])" --output tsv`,
                    'Checking for guest users'
                );
                
                if (parseInt(guestCheck) > 0) {
                    userExists = 1;
                    userPrincipalName = guestUpn;
                    userObjectId = await runCommand(
                        `az ad user show --id "${guestUpn}" --query "id" --output tsv`,
                        'Getting guest user object ID'
                    );
                    success(`User found as guest: ${guestUpn}`);
                }
            } catch (err) {
                // User doesn't exist as guest either
            }
        }

        // Invite user if they don't exist
        if (userExists === 0) {
            info('User not found in tenant. Sending B2B guest invitation...');
            
            const invitationBody = JSON.stringify({
                invitedUserEmailAddress: email,
                invitedUserDisplayName: userDisplayName,
                inviteRedirectUrl: "https://green-smoke-0db3ad503.3.azurestaticapps.net",
                sendInvitationMessage: true,
                invitedUserMessageInfo: {
                    customizedMessageBody: `Welcome to VibeNow ITSM! You have been granted ${role} access to our IT Service Management system.`
                }
            });
            
            const invitationCmd = `az rest --method POST --url "https://graph.microsoft.com/v1.0/invitations" --body '${invitationBody}' --headers "Content-Type=application/json"`;
            
            const invitationResult = await runCommand(invitationCmd, 'Sending B2B invitation via Microsoft Graph API');
            const invitation = JSON.parse(invitationResult);
            
            userObjectId = invitation.invitedUser.id;
            userPrincipalName = invitation.invitedUser.userPrincipalName;
            const redeemUrl = invitation.inviteRedeemUrl;
            
            success('B2B invitation sent successfully!');
            info(`User Object ID: ${userObjectId}`);
            info(`User Principal Name: ${userPrincipalName}`);
            warning(`Invitation email sent to: ${email}`);
            info(`Redemption URL: ${redeemUrl}`);
        } else {
            success(`Using existing user with Object ID: ${userObjectId}`);
        }

        // Add user to database (using consolidated Users table)
        info('Adding user to database...');
        
        const assignedBy = await runCommand(
            `az account show --query 'user.name' --output tsv`,
            'Getting current user for audit trail'
        ).catch(() => 'script');

        // Generate username from email
        const username = email.split('@')[0];
        const firstName = userDisplayName.split(' ')[0] || userDisplayName;
        const lastName = userDisplayName.split(' ').slice(1).join(' ') || '';

        const sqlCommand = `
IF EXISTS (SELECT 1 FROM Users WHERE Email = '${email}')
BEGIN
    -- Update existing user
    UPDATE Users 
    SET Role = '${role}', 
        DisplayName = '${userDisplayName}',
        ExternalID = '${userObjectId}',
        ModifiedBy = '${assignedBy}',
        ModifiedDate = GETUTCDATE(),
        IsActive = 1
    WHERE Email = '${email}'
    PRINT 'Updated ${role} role for ${email}'
END
ELSE
BEGIN
    -- Insert new user
    INSERT INTO Users (Email, Username, DisplayName, FirstName, LastName, Role, ExternalID, CreatedBy, CreatedDate, IsActive) 
    VALUES ('${email}', '${username}', '${userDisplayName}', '${firstName}', '${lastName}', '${role}', '${userObjectId}', '${assignedBy}', GETUTCDATE(), 1)
    PRINT 'Added ${role} role for ${email}'
END

-- Show current user info
SELECT Email, DisplayName, Role, ExternalID, CreatedBy, CreatedDate, IsActive 
FROM Users 
WHERE Email = '${email}'
        `.trim();

        await runCommand(
            `sqlcmd -S vibenow.database.windows.net -d "VibeNow-Test" -G -l 30 -Q "${sqlCommand}"`,
            'Executing database user assignment'
        );

        success('Database user assignment completed!');

        // Summary
        console.log();
        success('=== USER SETUP COMPLETE ===');
        info(`Email: ${email}`);
        info(`Role: ${role}`);
        info(`Display Name: ${userDisplayName}`);
        info(`Object ID: ${userObjectId}`);
        info(`Principal Name: ${userPrincipalName}`);

        if (userExists === 0) {
            console.log();
            warning('=== NEXT STEPS ===');
            warning(`1. Send invitation link to ${email} (check their email)`);
            warning('2. User must click the link to accept the invitation');
            warning('3. User can then access the app at: https://green-smoke-0db3ad503.3.azurestaticapps.net');
        } else {
            console.log();
            success('User can now access the app at: https://green-smoke-0db3ad503.3.azurestaticapps.net');
        }

    } catch (err) {
        error('Failed to add user');
        console.error(err.message);
        process.exit(1);
    }
}

// Run the script
addUser();