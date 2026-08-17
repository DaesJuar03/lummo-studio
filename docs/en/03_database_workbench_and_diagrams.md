# Database Workbench & Entity-Relationship Diagrams

<p align="center">
  <strong>Lummo Studio v2.1.0 — Technical Module 03 (English)</strong>
</p>

<p align="center">
  <a href="../INDEX_EN.md">← Back to Main Index</a> | 
  <a href="../es/03_workbench_bases_de_datos_y_diagramas.md">Versión en Español</a>
</p>

---

## 1. Multi-Engine SQL Support

Lummo Studio operates as a unified database management client, using native Node.js drivers:

| SQL Engine | Driver / Library | Connection Mode |
| :--- | :--- | :--- |
| **SQLite 3** | `sql.js` / Node.js filesystem persistence | Local `.db`, `.sqlite`, `.sqlite3` files |
| **MySQL / MariaDB** | `mysql2/promise` | TCP/IP Connection (Host, Port, User, Password) |
| **PostgreSQL** | `pg` (node-postgres) | TCP/IP / Connection String / SSL |

---

## 2. Entity-Relationship (ER) Diagram Engine

`ErDiagramModal.jsx` provides visual schema diagrams for database tables and foreign key relationships.

### ER Diagram Capabilities:
- **Auto-Layout & Schema Inspection**: Inspects primary keys (`PK`) and foreign keys (`FK`) to auto-position table nodes.
- **Interactive HTML5 Canvas**: Supports node dragging, mouse wheel zooming, and Bezier curve connectors.
- **Exporting Options**: Export full database ER maps to high-resolution PNG or SVG images.

```text
[Table: users]                [Table: orders]
+------------------+          +------------------+
| id (PK)          |-------<  | id (PK)          |
| name             |          | user_id (FK)     |
| email            |          | total_amount     |
+------------------+          +------------------+
```

---

## 3. Visual Schema Designer & SQL Query Runner

### 3.1 Visual Table Designer (`SchemaDesignerModal.jsx`)
Create or modify table structures visually without writing complex DDL scripts:
- Add, rename, or drop columns.
- Data types: `VARCHAR`, `INT`, `BIGINT`, `TIMESTAMP`, `BOOLEAN`, `TEXT`, `BLOB`.
- Modifiers: `NOT NULL`, `AUTO_INCREMENT`, `UNIQUE`, `DEFAULT`.
- Define Primary Keys and secondary indexes.

### 3.2 SQL Query Runner & Virtualized Grid
Located in `DatabaseDetailPage.jsx` and `SQLiteWorkbench.jsx`:
- **SQL Query Console**: Multi-line SQL query editor with syntax highlighting and query history.
- **Virtualized Data Grid**: Prevents UI freeze when rendering large result sets by rendering only visible rows on screen.

---

## 4. Synthetic Mock Data Generator & Import/Export

### 4.1 Synthetic Data Generator (`MockDataGeneratorModal.jsx`)
Populate test tables with synthetic data (names, emails, dates, phone numbers, IP addresses, UUIDs) for stress testing (e.g. 100, 1,000, or 10,000 rows).

### 4.2 SQL Import & Export (`ImportExportSqlModal.jsx` & `DataExportModal.jsx`)
- **Exporting**:
  - Dump complete database schemas and records to `.sql` files.
  - Export query result sets to **CSV** and **JSON**.
- **Importing**:
  - Execute external `.sql` dump files to restore databases.
