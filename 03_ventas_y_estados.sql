USE [EntrePaginasDB];
GO

/* PARTE 3 - REGISTRO Y ESTADOS */
/* Registro completo de una venta con varios renglones en JSON.
   Formato: [{"IdLibro": 1, "Cantidad": 2}, {"IdLibro": 3, "Cantidad": 1}].
   El precio se toma siempre de la base de datos. */
CREATE OR ALTER PROCEDURE dbo.usp_RegistrarVenta
    @IdCliente INT,
    @DetalleJson NVARCHAR(MAX),
    @IdVenta INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET @IdVenta = NULL;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM dbo.Clientes WHERE IdCliente = @IdCliente)
            THROW 50002, 'El cliente no existe.', 1;
        IF @DetalleJson IS NULL OR ISJSON(@DetalleJson) <> 1 OR LEFT(LTRIM(@DetalleJson), 1) <> N'['
            THROW 50003, 'El detalle debe ser un arreglo JSON válido.', 1;

        DECLARE @Detalle TABLE (
            IdLibro INT NULL,
            Cantidad INT NULL
        );

        INSERT INTO @Detalle (IdLibro, Cantidad)
        SELECT TRY_CONVERT(INT, JSON_VALUE(J.value, '$.IdLibro')),
               TRY_CONVERT(INT, JSON_VALUE(J.value, '$.Cantidad'))
        FROM OPENJSON(@DetalleJson) AS J;

        IF NOT EXISTS (SELECT 1 FROM @Detalle)
            THROW 50004, 'La venta debe incluir al menos un libro.', 1;
        IF EXISTS (SELECT 1 FROM @Detalle WHERE IdLibro IS NULL OR Cantidad IS NULL OR Cantidad <= 0)
            THROW 50005, 'Cada renglón debe contener un libro y una cantidad positiva.', 1;
        IF EXISTS (SELECT IdLibro FROM @Detalle GROUP BY IdLibro HAVING COUNT(*) > 1)
            THROW 50006, 'No se puede repetir el mismo libro en el detalle.', 1;
        IF EXISTS (SELECT 1 FROM @Detalle AS D
                   LEFT JOIN dbo.Libros AS L ON L.IdLibro = D.IdLibro
                   WHERE L.IdLibro IS NULL)
            THROW 50007, 'Uno de los libros no existe.', 1;

        /* Bloquea los libros a vender hasta confirmar la transacción. */
        IF EXISTS (
            SELECT 1 FROM @Detalle AS D
            INNER JOIN dbo.Libros AS L WITH (UPDLOCK, HOLDLOCK) ON L.IdLibro = D.IdLibro
            WHERE L.Stock < D.Cantidad
        )
            THROW 50008, 'Stock insuficiente para uno o más libros.', 1;

        DECLARE @Total DECIMAL(12,2);
        SELECT @Total = SUM(CONVERT(DECIMAL(18,2), D.Cantidad) * L.Precio)
        FROM @Detalle AS D
        INNER JOIN dbo.Libros AS L ON L.IdLibro = D.IdLibro;

        IF @Total IS NULL OR @Total <= 0 OR @Total > 9999999999.99
            THROW 50009, 'El total de la venta no es válido.', 1;

        INSERT INTO dbo.Ventas (IdCliente, Fecha, Estado, Total)
        VALUES (@IdCliente, GETDATE(), N'preparación', @Total);

        SET @IdVenta = CONVERT(INT, SCOPE_IDENTITY());

        INSERT INTO dbo.DetalleVentas (IdLibro, IdVenta, Cantidad, PrecioUnitario)
        SELECT D.IdLibro, @IdVenta, D.Cantidad, L.Precio
        FROM @Detalle AS D
        INNER JOIN dbo.Libros AS L ON L.IdLibro = D.IdLibro;

        UPDATE L
        SET L.Stock = L.Stock - D.Cantidad
        FROM dbo.Libros AS L
        INNER JOIN @Detalle AS D ON D.IdLibro = L.IdLibro;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

/* Flujo permitido: preparación -> listo -> entregado.
   Solo una venta en preparación puede pasar a cancelado.
   La cancelación devuelve el stock; no se permite repetir, retroceder ni saltear estados. */
CREATE OR ALTER PROCEDURE dbo.usp_CambiarEstadoVenta
    @IdVenta INT,
    @NuevoEstado NVARCHAR(12)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @EstadoActual NVARCHAR(12);
        SELECT @EstadoActual = Estado
        FROM dbo.Ventas WITH (UPDLOCK, HOLDLOCK)
        WHERE IdVenta = @IdVenta;

        IF @EstadoActual IS NULL
            THROW 50010, 'La venta no existe.', 1;

        IF @NuevoEstado IS NULL OR @NuevoEstado NOT IN (N'listo', N'entregado', N'cancelado')
            THROW 50011, 'El nuevo estado indicado no es válido.', 1;

        IF NOT (
            (@EstadoActual = N'preparación' AND @NuevoEstado IN (N'listo', N'cancelado'))
            OR (@EstadoActual = N'listo' AND @NuevoEstado = N'entregado')
        )
            THROW 50012, 'Cambio de estado no permitido.', 1;

        IF @NuevoEstado = N'cancelado'
        BEGIN
            /* Restituir una sola vez las unidades al cancelar la venta. */
            UPDATE L
            SET L.Stock = L.Stock + D.Cantidad
            FROM dbo.Libros AS L
            INNER JOIN dbo.DetalleVentas AS D ON D.IdLibro = L.IdLibro
            WHERE D.IdVenta = @IdVenta;
        END;

        UPDATE dbo.Ventas
        SET Estado = @NuevoEstado
        WHERE IdVenta = @IdVenta;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

/* 5. CONSULTAS DE VERIFICACIÓN */
SELECT (SELECT COUNT(*) FROM dbo.Categorias) AS TotalCategorias,
       (SELECT COUNT(*) FROM dbo.Clientes) AS TotalClientes,
       (SELECT COUNT(*) FROM dbo.Libros) AS TotalLibros,
       (SELECT COUNT(*) FROM dbo.Ventas) AS TotalVentas;
GO
