/* 1. BASE DE DATOS Y ACCESO */
USE [master];
GO
IF DB_ID(N'EntrePaginasDB') IS NULL
    CREATE DATABASE [EntrePaginasDB];
GO

/* Usuario de desarrollo: se aceptan los logins prog2 y Prog2.
   La comparación no distingue mayúsculas para funcionar con distintas intercalaciones.
   No se modifica el propietario dbo ni se alteran contraseñas de logins existentes. */
IF NOT EXISTS (
    SELECT 1 FROM sys.server_principals
    WHERE name COLLATE Latin1_General_100_CI_AS = N'prog2'
)
BEGIN
    CREATE LOGIN [prog2] WITH PASSWORD = 'Prog2.2026', CHECK_POLICY = ON;
END;
GO

USE [EntrePaginasDB];
GO

DECLARE @Login SYSNAME;
DECLARE @Usuario SYSNAME;
DECLARE @SQL NVARCHAR(MAX);

/* Prioriza prog2 exacto; si no existe, utiliza Prog2. */
SELECT TOP (1) @Login = name
FROM sys.server_principals
WHERE name COLLATE Latin1_General_100_CI_AS = N'prog2'
ORDER BY CASE WHEN name COLLATE Latin1_General_100_BIN2 = N'prog2' THEN 0 ELSE 1 END;

IF @Login IS NOT NULL
BEGIN
    SELECT TOP (1) @Usuario = name
    FROM sys.database_principals
    WHERE sid = SUSER_SID(@Login);

    IF @Usuario IS NULL
    BEGIN
        /* Evita colisionar con un usuario ya existente que tenga el mismo nombre. */
        IF EXISTS (
            SELECT 1 FROM sys.database_principals
            WHERE name = @Login
        )
            THROW 50020, 'El usuario de base existe con otra asociación: revisar login y usuario.', 1;

        SET @SQL = N'CREATE USER ' + QUOTENAME(@Login) + N' FOR LOGIN ' + QUOTENAME(@Login);
        EXEC sys.sp_executesql @SQL;
        SET @Usuario = @Login;
    END;

    IF @Usuario <> N'dbo'
    BEGIN
        IF ISNULL(IS_ROLEMEMBER(N'db_datareader', @Usuario), 0) = 0
        BEGIN
            SET @SQL = N'ALTER ROLE [db_datareader] ADD MEMBER ' + QUOTENAME(@Usuario);
            EXEC sys.sp_executesql @SQL;
        END;

        IF ISNULL(IS_ROLEMEMBER(N'db_datawriter', @Usuario), 0) = 0
        BEGIN
            SET @SQL = N'ALTER ROLE [db_datawriter] ADD MEMBER ' + QUOTENAME(@Usuario);
            EXEC sys.sp_executesql @SQL;
        END;

        SET @SQL = N'GRANT EXECUTE TO ' + QUOTENAME(@Usuario);
        EXEC sys.sp_executesql @SQL;
    END;
END;
GO

/* 2. TABLAS Y CLAVES FORÁNEAS */
IF OBJECT_ID(N'dbo.Categorias', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categorias (
        IdCategoria INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Categorias PRIMARY KEY,
        Nombre NVARCHAR(80) NOT NULL
    );
END;
GO
IF OBJECT_ID(N'dbo.Clientes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Clientes (
        IdCliente INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Clientes PRIMARY KEY,
        Nombre NVARCHAR(80) NOT NULL,
        Apellido NVARCHAR(80) NOT NULL,
        DNI VARCHAR(8) NOT NULL CONSTRAINT IX_Clientes_DNI UNIQUE,
        Telefono NVARCHAR(10) NOT NULL CONSTRAINT IX_Clientes_Telefono UNIQUE,
        Email NVARCHAR(60) NOT NULL CONSTRAINT IX_Clientes_Email UNIQUE,
        Fecha_alta DATETIME NOT NULL CONSTRAINT DF_Clientes_Fecha_alta DEFAULT (GETDATE())
    );
END;
GO
IF OBJECT_ID(N'dbo.Libros', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Libros (
        IdLibro INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Libros PRIMARY KEY,
        Codigo_Libro NVARCHAR(50) NOT NULL,
        Titulo NVARCHAR(80) NOT NULL,
        Precio DECIMAL(12,2) NOT NULL CONSTRAINT CK_Libros_Precio CHECK (Precio > 0),
        Autor NVARCHAR(80) NOT NULL,
        Editorial NVARCHAR(80) NOT NULL,
        Stock INT NOT NULL CONSTRAINT CK_Libros_Stock CHECK (Stock >= 0),
        IdCategoria INT NOT NULL CONSTRAINT FK_Libros_Categorias REFERENCES dbo.Categorias(IdCategoria)
    );
END;
GO
IF OBJECT_ID(N'dbo.Ventas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Ventas (
        IdVenta INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Ventas PRIMARY KEY,
        IdCliente INT NOT NULL CONSTRAINT FK_Ventas_Clientes REFERENCES dbo.Clientes(IdCliente),
        Fecha DATETIME NOT NULL CONSTRAINT DF_Ventas_Fecha DEFAULT (GETDATE()),
        Estado NVARCHAR(12) NOT NULL CONSTRAINT DF_Ventas_Estado DEFAULT (N'preparación'),
        Total DECIMAL(12,2) NOT NULL CONSTRAINT CK_Ventas_Total CHECK (Total > 0),
        CONSTRAINT CK_Ventas_Estado CHECK (Estado IN (N'preparación', N'listo', N'entregado', N'cancelado'))
    );
END;
GO
IF OBJECT_ID(N'dbo.DetalleVentas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DetalleVentas (
        IdDetalleVenta INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DetalleVentas PRIMARY KEY,
        IdLibro INT NOT NULL CONSTRAINT FK_DetalleVentas_Libros REFERENCES dbo.Libros(IdLibro),
        IdVenta INT NOT NULL CONSTRAINT FK_DetalleVentas_Ventas REFERENCES dbo.Ventas(IdVenta),
        Cantidad INT NOT NULL CONSTRAINT CK_DetalleVentas_Cantidad CHECK (Cantidad > 0),
        PrecioUnitario DECIMAL(12,2) NOT NULL CONSTRAINT CK_DetalleVentas_PrecioUnitario CHECK (PrecioUnitario > 0)
    );
END;
GO

/* 2.1. ACTUALIZACIÓN DE ESTADOS EN BASES YA CREADAS. */
/* Las ventas ya canceladas se conservan sin alterar su stock historico. */
/* Eliminar restricciones anteriores para permitir la transición de valores. */
IF OBJECT_ID(N'dbo.CK_Ventas_Estado', N'C') IS NOT NULL
    ALTER TABLE dbo.Ventas DROP CONSTRAINT CK_Ventas_Estado;
GO

/* Cambiar los valores del modelo anterior, conservando las ventas. */
UPDATE dbo.Ventas
SET Estado = CASE Estado
    WHEN N'pendiente' THEN N'preparación'
    WHEN N'pagado' THEN N'listo'
    WHEN N'entrega' THEN N'entregado'
    ELSE Estado
END
WHERE Estado IN (N'pendiente', N'pagado', N'entrega');
GO

/* Actualizar el valor predeterminado sin depender del nombre de la restricción. */
DECLARE @DefaultConstraint SYSNAME;
SELECT @DefaultConstraint = dc.name
FROM sys.default_constraints AS dc
INNER JOIN sys.columns AS c
    ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE dc.parent_object_id = OBJECT_ID(N'dbo.Ventas') AND c.name = N'Estado';
IF @DefaultConstraint IS NOT NULL
BEGIN
    DECLARE @SQL NVARCHAR(MAX);
    SET @SQL = N'ALTER TABLE dbo.Ventas DROP CONSTRAINT ' + QUOTENAME(@DefaultConstraint);
    EXEC sys.sp_executesql @SQL;
END;
ALTER TABLE dbo.Ventas ADD CONSTRAINT DF_Ventas_Estado DEFAULT (N'preparación') FOR Estado;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.Ventas') AND name = N'CK_Ventas_Estado')
    ALTER TABLE dbo.Ventas ADD CONSTRAINT CK_Ventas_Estado
        CHECK (Estado IN (N'preparación', N'listo', N'entregado', N'cancelado'));
GO

/* 3. DATOS INICIALES: LIBROS, CATEGORÍAS Y EDITORIALES TOMADOS DEL CATÁLOGO DE REFERENCIA. */
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Cocina')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Cocina');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Reposteria')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Reposteria');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Comics/Infantiles')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Comics/Infantiles');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Administracion')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Administracion');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Autoayuda')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Autoayuda');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Ensayos/Novelas')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Ensayos/Novelas');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Musica')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Musica');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Marketing')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Marketing');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Deportes')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Deportes');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Politica')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Politica');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Literatura Infantil')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Literatura Infantil');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Idiomas')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Idiomas');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Historia Argentina')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Historia Argentina');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Humor')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Humor');
IF NOT EXISTS (SELECT 1 FROM dbo.Categorias WHERE Nombre = N'Literatura Juvenil')
    INSERT INTO dbo.Categorias (Nombre) VALUES (N'Literatura Juvenil');
GO

/* Clientes ficticios, únicamente para probar la aplicación. */
IF NOT EXISTS (SELECT 1 FROM dbo.Clientes WHERE DNI = '30111222')
    INSERT INTO dbo.Clientes (Nombre, Apellido, DNI, Telefono, Email) VALUES (N'Lucia', N'Pereyra', '30111222', '3514001101', N'lucia.pereyra@example.com');
IF NOT EXISTS (SELECT 1 FROM dbo.Clientes WHERE DNI = '32222333')
    INSERT INTO dbo.Clientes (Nombre, Apellido, DNI, Telefono, Email) VALUES (N'Martin', N'Roldan', '32222333', '3514001102', N'martin.roldan@example.com');
IF NOT EXISTS (SELECT 1 FROM dbo.Clientes WHERE DNI = '34333444')
    INSERT INTO dbo.Clientes (Nombre, Apellido, DNI, Telefono, Email) VALUES (N'Sofia', N'Morales', '34333444', '3514001103', N'sofia.morales@example.com');
IF NOT EXISTS (SELECT 1 FROM dbo.Clientes WHERE DNI = '36555666')
    INSERT INTO dbo.Clientes (Nombre, Apellido, DNI, Telefono, Email) VALUES (N'Diego', N'Acosta', '36555666', '3514001104', N'diego.acosta@example.com');
IF NOT EXISTS (SELECT 1 FROM dbo.Clientes WHERE DNI = '38777888')
    INSERT INTO dbo.Clientes (Nombre, Apellido, DNI, Telefono, Email) VALUES (N'Valentina', N'Gomez', '38777888', '3514001105', N'valentina.gomez@example.com');
GO

/* Libros de catálogo real: se conservan precios y stock de la fuente; el código identifica cada ejemplar del catálogo. */
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'36364')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'36364', N'1 Base,100 Pizzas', 30000.00, N'Carter', N'Parragon Book LTD', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Cocina';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'41648')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'41648', N'1 Masa,100 Muffins', 30000.00, N'Tee', N'Parragon Book LTD', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Reposteria';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'43303')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'43303', N'2 Cuentos Clasicos-4 TS', 17500.00, N'Susaeta', N'Susaeta/Tikal', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Comics/Infantiles';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'30663')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'30663', N'3 Claves Para El Empowerment', 88000.00, N'Blanchard', N'Granica', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Administracion';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'46683')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'46683', N'3 Tecnicas Para Ser Feliz, Las', 16500.00, N'Ciley', N'Lugar', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Autoayuda';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'38710')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'38710', N'4 Fantasticos, Los', 31000.00, N'Pacheco', N'La Revisteria', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Comics/Infantiles';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'23271')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'23271', N'5 Hombres.La Intimidad...', 33000.00, N'Carranza', N'El Emporio', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Ensayos/Novelas';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'50129')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'50129', N'5 Seconds Of Summer"Eres Su..."', 30999.00, N'Allan', N'Ediciones B/Nova/Zeta', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Musica';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'22003')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'22003', N'6 Imperativos Del Marketing', 38199.00, N'Magrath', N'Vergara', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Marketing';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'33434')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'33434', N'6 Minutos Al Dia Estiramientos', 16500.00, N'Parragon', N'Parragon Book LTD', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Deportes';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'14275')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'14275', N'7 Cuentos Para Ir A Dormir', 20899.00, N'Andreone', N'Guadal', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Comics/Infantiles';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'53091')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'53091', N'7 Habitos De La Gente...(B)', 46900.00, N'Covey', N'Oniro/Paidos', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Autoayuda';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'66099')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'66099', N'7 Historias De Lucky Luke', 18000.00, N'Goscinny', N'Del Zorzal', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Comics/Infantiles';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'65980')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'65980', N'7 Pilares Del Amor Propio, Los', 43900.00, N'Riso', N'Planeta', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Autoayuda';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'18292')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'18292', N'8 Cuentos 8', 10100.00, N'Antologia', N'Colihue', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Literatura Infantil';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'3227')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'3227', N'8 Ghost Stories.LO 4', 40050.00, N'Burton', N'Longman/Pearson', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Idiomas';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'51500')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'51500', N'8 Reglas Del Amor, Las', 50999.00, N'Shetty', N'Grijalbo/Montena/Mondadori', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Autoayuda';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'3797')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'3797', N'9 De Julio(Libro+DVD)', 37900.00, N'Pigna', N'Planeta', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Historia Argentina';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'7840')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'7840', N'9 De Noviembre', 50900.00, N'Hoover', N'Planeta', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Ensayos/Novelas';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'11633')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'11633', N'10 Anos Con Mafalda', 36500.00, N'Quino', N'De La Flor', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Humor';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'30365')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'30365', N'10 Cosas Que Nunca Pasaron', 43000.00, N'Hall', N'Vergara & Riba', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Literatura Juvenil';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'65764')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'65764', N'10 Cuentos Esenciales', 52900.00, N'Conti', N'Emece', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Ensayos/Novelas';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'54359')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'54359', N'10 Lecciones Para Salir...', 43900.00, N'Feinmann', N'Planeta', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Politica';
IF NOT EXISTS (SELECT 1 FROM dbo.Libros WHERE Codigo_Libro = N'66622')
    INSERT INTO dbo.Libros (Codigo_Libro, Titulo, Precio, Autor, Editorial, Stock, IdCategoria)
    SELECT N'66622', N'10 Lugares Magicos De Argentina', 44499.00, N'Galvez', N'Debate/Plaza & Janes', 5, IdCategoria
    FROM dbo.Categorias WHERE Nombre = N'Ensayos/Novelas';
GO

/* 4. PROCEDIMIENTOS ALMACENADOS */

/* Catálogo de categorías para el formulario de libros. */
CREATE OR ALTER PROCEDURE dbo.usp_ListarCategorias
AS
BEGIN
    SET NOCOUNT ON;
    SELECT IdCategoria, Nombre FROM dbo.Categorias ORDER BY Nombre;
END;
GO

/* Clientes disponibles para seleccionar al registrar una venta. */
CREATE OR ALTER PROCEDURE dbo.usp_ListarClientes
AS
BEGIN
    SET NOCOUNT ON;
    SELECT IdCliente, Nombre, Apellido, DNI, Telefono, Email
    FROM dbo.Clientes ORDER BY Apellido, Nombre;
END;
GO

/* Listado del catálogo con su categoría. */
CREATE OR ALTER PROCEDURE dbo.usp_ListarLibros
AS
BEGIN
    SET NOCOUNT ON;
    SELECT L.IdLibro, L.Codigo_Libro, L.Titulo, L.Autor,
           L.Editorial, L.Precio, L.Stock, L.IdCategoria,
           C.Nombre AS Categoria
    FROM dbo.Libros AS L
    INNER JOIN dbo.Categorias AS C ON C.IdCategoria = L.IdCategoria
    ORDER BY L.Titulo;
END;
GO

/* Búsqueda parametrizada con filtros opcionales. */
CREATE OR ALTER PROCEDURE dbo.usp_BuscarLibros
    @Texto NVARCHAR(80) = NULL,
    @IdCategoria INT = NULL,
    @SoloConStock BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT L.IdLibro, L.Codigo_Libro, L.Titulo, L.Autor,
           L.Editorial, L.Precio, L.Stock, L.IdCategoria,
           C.Nombre AS Categoria
    FROM dbo.Libros AS L
    INNER JOIN dbo.Categorias AS C ON C.IdCategoria = L.IdCategoria
    WHERE (@Texto IS NULL OR @Texto = N'' OR
           L.Titulo LIKE N'%' + @Texto + N'%' OR
           L.Autor LIKE N'%' + @Texto + N'%' OR
           L.Codigo_Libro LIKE N'%' + @Texto + N'%')
      AND (@IdCategoria IS NULL OR L.IdCategoria = @IdCategoria)
      AND (ISNULL(@SoloConStock, 0) = 0 OR L.Stock > 0)
    ORDER BY L.Titulo;
END;
GO


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
