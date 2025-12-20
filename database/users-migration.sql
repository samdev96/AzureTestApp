-- Migrate existing user data from UserRoles table
-- Run this AFTER creating the Users table
-- UserRoles already has clean user data we can use

-- Insert users from UserRoles table
INSERT INTO Users (Email, Username, DisplayName, FirstName, LastName, Role, CreatedBy, CreatedDate)
SELECT 
    userEmail AS Email,
    LEFT(userEmail, CHARINDEX('@', userEmail + '@') - 1) AS Username,
    COALESCE(userName, userEmail) AS DisplayName,
    COALESCE(userName, userEmail) AS FirstName,
    '' AS LastName,
    role AS Role,
    'System Migration' AS CreatedBy,
    GETUTCDATE() AS CreatedDate
FROM UserRoles
WHERE userEmail IS NOT NULL 
    AND LTRIM(RTRIM(userEmail)) <> ''
    AND NOT EXISTS (SELECT 1 FROM Users WHERE Email = UserRoles.userEmail)
GROUP BY userEmail, userName, role;

-- Report migration results
SELECT 
    'Migration Complete' AS Status,
    (SELECT COUNT(*) FROM Users) AS TotalUsers,
    (SELECT COUNT(*) FROM Users WHERE Role = 'user') AS RegularUsers,
    (SELECT COUNT(*) FROM Users WHERE Role = 'agent') AS Agents,
    (SELECT COUNT(*) FROM Users WHERE Role = 'admin') AS Admins;

PRINT 'User data migration completed successfully';
