const jwt = require('jsonwebtoken');

function roleBasedAccess(requireRoles) {
  return async (req, res, next) => {
    console.log("Request Headers:", req.headers);

    const data = req.headers["authorization"];
    const token = data && data.split(' ')[1]; // Extract token

    if (!token) {
      return res.status(401).json({ message: "Token Not Found" });
    }

    jwt.verify(token, 'ikeyqr', (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Token Invalid", error: err.message });
      }

      console.log(decoded);
      console.log(requireRoles);

      // Check if the user's role is in the allowed roles array
      if (requireRoles && !requireRoles.includes(decoded.role)) {
        return res.status(403).json({ message: "Access Denied: Insufficient Permissions" });
      }

      // Attach user information to request object
      req.user = decoded;
      console.log(req.user)

      next();
    });
  };
}

module.exports = roleBasedAccess;
