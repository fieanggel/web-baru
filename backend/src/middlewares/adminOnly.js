function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Akses ditolak! Anda bukan admin.',
    })
  }

  return next()
}

module.exports = adminOnly
