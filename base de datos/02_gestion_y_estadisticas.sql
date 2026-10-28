USE [EntrePaginasDB];
GO

/* PARTE 2 - GESTION Y ESTADISTICAS */
/* Listado relacionado: Ventas, Clientes, DetalleVentas y Libros. */
CREATE OR ALTER PROCEDURE dbo.usp_ListarVentas
AS
BEGIN
    SET NOCOUNT ON;
    SELECT V.IdVenta, V.Fecha, V.Estado, V.Total,
           C.IdCliente, C.Nombre, C.Apellido,
           COUNT(DV.IdDetalleVenta) AS CantidadRenglones,
           SUM(DV.Cantidad) AS CantidadLibros
    FROM dbo.Ventas AS V
    INNER JOIN dbo.Clientes AS C ON C.IdCliente = V.IdCliente
    INNER JOIN dbo.DetalleVentas AS DV ON DV.IdVenta = V.IdVenta
    INNER JOIN dbo.Libros AS L ON L.IdLibro = DV.IdLibro
    GROUP BY V.IdVenta, V.Fecha, V.Estado, V.Total,
             C.IdCliente, C.Nombre, C.Apellido
    ORDER BY V.Fecha DESC, V.IdVenta DESC;
END;
GO

/* Filtros de gestión por estado, cliente y período. */
CREATE OR ALTER PROCEDURE dbo.usp_BuscarVentas
    @Estado NVARCHAR(12) = NULL,
    @TextoCliente NVARCHAR(80) = NULL,
    @Desde DATE = NULL,
    @Hasta DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Desde IS NOT NULL AND @Hasta IS NOT NULL AND @Desde > @Hasta
        THROW 50001, 'La fecha inicial no puede ser posterior a la final.', 1;

    SELECT V.IdVenta, V.Fecha, V.Estado, V.Total,
           C.IdCliente, C.Nombre, C.Apellido, C.DNI
    FROM dbo.Ventas AS V
    INNER JOIN dbo.Clientes AS C ON C.IdCliente = V.IdCliente
    WHERE (@Estado IS NULL OR @Estado = N'' OR V.Estado = @Estado)
      AND (@TextoCliente IS NULL OR @TextoCliente = N'' OR
           C.Nombre LIKE N'%' + @TextoCliente + N'%' OR
           C.Apellido LIKE N'%' + @TextoCliente + N'%' OR
           C.DNI LIKE '%' + @TextoCliente + '%')
      AND (@Desde IS NULL OR V.Fecha >= @Desde)
      AND (@Hasta IS NULL OR V.Fecha < DATEADD(DAY, 1, @Hasta))
    ORDER BY V.Fecha DESC, V.IdVenta DESC;
END;
GO

/* Estadística por categoría de todas las ventas. */
CREATE OR ALTER PROCEDURE dbo.usp_EstadisticasVentas
AS
BEGIN
    SET NOCOUNT ON;
    SELECT C.IdCategoria, C.Nombre AS Categoria,
           COUNT(DISTINCT V.IdVenta) AS CantidadVentas,
           SUM(DV.Cantidad) AS UnidadesVendidas,
           SUM(DV.Cantidad * DV.PrecioUnitario) AS TotalVendido
    FROM dbo.Categorias AS C
    INNER JOIN dbo.Libros AS L ON L.IdCategoria = C.IdCategoria
    INNER JOIN dbo.DetalleVentas AS DV ON DV.IdLibro = L.IdLibro
    INNER JOIN dbo.Ventas AS V ON V.IdVenta = DV.IdVenta
    GROUP BY C.IdCategoria, C.Nombre
    ORDER BY TotalVendido DESC;
END;
GO

