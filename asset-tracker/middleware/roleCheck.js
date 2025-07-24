module.exports = function roleCheck(allowedRoles = []) {
  return (req, res, next) => {
    if(!req.session.user) {
      return res.redirect('/login?message=Please login first');
    }
    const userRole = req.session.user.role;
    if(allowedRoles.includes(userRole)) {
      return next();
    } else {
      return res.status(403).render('auth/unauthorized', {
        message: 'You do not have permission to view this page'
      });
    }
  };
}
