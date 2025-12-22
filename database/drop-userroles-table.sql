-- Drop UserRoles Table Migration
-- ================================
-- Run this script AFTER confirming the Users table migration is complete
-- and the application is working correctly with the Users table.
--
-- This script will:
-- 1. Verify Users table has data
-- 2. Create a backup of UserRoles data (optional)
-- 3. Drop the UserRoles table
--
-- WARNING: This is a destructive operation. Make sure to:
-- 1. Test the application thoroughly with the new Users table
-- 2. Backup your database before running this script
-- 3. Run in a non-production environment first

-- Step 1: Verify Users table has data
PRINT 'Checking Users table...';
SELECT COUNT(*) AS UsersCount FROM Users;

-- Step 2: Compare data between tables (verification)
PRINT 'Comparing UserRoles emails with Users emails...';
SELECT 
    (SELECT COUNT(DISTINCT UserEmail) FROM UserRoles WHERE IsActive = 1) AS UserRolesActiveEmails,
    (SELECT COUNT(*) FROM Users WHERE IsActive = 1) AS UsersActiveCount;

-- Check for any UserRoles entries not in Users table
PRINT 'Checking for UserRoles entries not migrated to Users...';
SELECT ur.UserEmail, ur.RoleName 
FROM UserRoles ur 
WHERE ur.IsActive = 1 
AND NOT EXISTS (SELECT 1 FROM Users u WHERE u.Email = ur.UserEmail);

-- Step 3: Backup UserRoles data to a new table (optional but recommended)
PRINT 'Creating backup of UserRoles table...';
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserRoles_Backup')
BEGIN
    SELECT * INTO UserRoles_Backup FROM UserRoles;
    PRINT 'Backup created: UserRoles_Backup';
END
ELSE
BEGIN
    PRINT 'Backup table already exists: UserRoles_Backup';
END

-- Step 4: Drop the UserRoles table
-- UNCOMMENT THE LINES BELOW ONLY AFTER VERIFYING THE MIGRATION IS COMPLETE
/*
PRINT 'Dropping UserRoles table...';
DROP TABLE UserRoles;
PRINT 'UserRoles table dropped successfully!';
*/

PRINT '';
PRINT '=== MIGRATION SUMMARY ===';
PRINT 'UserRoles table has been backed up to UserRoles_Backup';
PRINT 'To complete the migration, uncomment the DROP TABLE statement above';
PRINT 'and run this script again.';
PRINT '';
PRINT 'Before dropping, verify:';
PRINT '1. Application login/authentication works';
PRINT '2. User management UI shows all users';
PRINT '3. Role-based access control works correctly';
