-- Migrate existing user data from UserRoles table
-- Run this AFTER creating the Users table
-- UserRoles already has clean user data we can use

-- First, clear existing Users table to avoid conflicts
DELETE FROM Users;

-- Insert users from UserRoles table (one row per unique email)
-- For users with multiple roles, pick the highest privilege role
INSERT INTO Users (Email, Username, DisplayName, FirstName, LastName, Role, CreatedBy, CreatedDate)
SELECT 
    UserEmail AS Email,
    LEFT(UserEmail, CHARINDEX('@', UserEmail + '@') - 1) AS Username,
    MAX(COALESCE(DisplayName, UserEmail)) AS DisplayName,
    MAX(COALESCE(DisplayName, UserEmail)) AS FirstName,
    '' AS LastName,
    -- Pick highest privilege role: admin > agent > user
    CASE 
        WHEN MAX(CASE WHEN RoleName = 'admin' THEN 1 ELSE 0 END) = 1 THEN 'admin'
        WHEN MAX(CASE WHEN RoleName = 'agent' THEN 1 ELSE 0 END) = 1 THEN 'agent'
        ELSE 'user'
    END AS Role,
    'System Migration' AS CreatedBy,
    GETUTCDATE() AS CreatedDate
FROM UserRoles
WHERE UserEmail IS NOT NULL 
    AND LTRIM(RTRIM(UserEmail)) <> ''
GROUP BY UserEmail;

-- Report migration results
SELECT 
    'Migration Complete' AS Status,
    (SELECT COUNT(*) FROM Users) AS TotalUsers,
    (SELECT COUNT(*) FROM Users WHERE Role = 'user') AS RegularUsers,
    (SELECT COUNT(*) FROM Users WHERE Role = 'agent') AS Agents,
    (SELECT COUNT(*) FROM Users WHERE Role = 'admin') AS Admins;

PRINT 'User data migration completed successfully';
