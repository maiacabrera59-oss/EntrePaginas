function asyncHandler(controlador) {
    return (req, res, next) => {
        Promise.resolve(controlador(req, res, next)).catch(next);
    };
}

module.exports = asyncHandler;