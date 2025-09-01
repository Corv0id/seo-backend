const verifyRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req?.roles) return res.sendStatus(401);
        const rolesArray = [...allowedRoles];
        // Check if the single role in req.roles (string) is in allowedRoles
        const result = rolesArray.includes(req.roles);
        if (!result) return res.sendStatus(401);
        next();
    }
}

module.exports = verifyRoles