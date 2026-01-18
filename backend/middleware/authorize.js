// middleware/authorize.js
export const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.headers['x-user-role']; // Passed from frontend after login
        if (allowedRoles.includes(userRole)) {
            next();
        } else {
            res.status(403).json({ error: "Access Denied: Insufficient Permissions" });
        }
    };
};