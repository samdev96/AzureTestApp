-- Migrate existing user data from UserRoles table
-- Run this AFTER creating the Users table
-- UserRoles already has clean user data we can use

-- Insert users from UserRoles table
INSERT INTO Users (Email, Username, DisplayName, FirstName, LastName, Role, CreatedBy, CreatedDate)
SELECT 
    UserEmail AS Email,
    LEFT(UserEmail, CHARINDEX('@', UserEmail + '@') - 1) AS Username,
    COALESCE(UserName, UserEmail) AS DisplayName,
    COALESCE(UserName, UserEmail) AS FirstName,
    '' AS LastName,
    Role AS Role,
    'System Migration' AS CreatedBy,
    GETUTCDATE() AS CreatedDate
FROM UserRoles
WHERE UserEmail IS NOT NULL 
    AND LTRIM(RTRIM(UserEmail)) <> ''
    AND NOT EXISTS (SELECT 1 FROM Users WHERE Email = UserRoles.UserEmail)
GROUP BY UserEmail, UserName, Role;

-- Report migration results
SELECT 
    'Migration Complete' AS Status,
    (SELECT COUNT(*) FROM Users) AS TotalUsers,
    (SELECT COUNT(*) FROM Users WHERE Role = 'user') AS RegularUsers,
    (SELECT COUNT(*) FROM Users WHERE Role = 'agent') AS Agents,
    (SELECT COUNT(*) FROM Users WHERE Role = 'admin') AS Admins;

PRINT 'User data migration completed successfully';
