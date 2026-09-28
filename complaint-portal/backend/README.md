# Complaint Portal Backend

Express + TypeScript API using **MySQL through Prisma** for users and complaints. Uploaded image files remain in `uploads/`; the database stores their paths and complaint locations.

## Set up MySQL

1. Install and start MySQL Server.
2. Create the database using a MySQL client:

   ```sql
   source prisma/create-database.sql;
   ```

   Or run the contents of `prisma/create-database.sql` in MySQL Workbench.
3. Copy `.env.example` to `.env`. Set `DATABASE_URL`, `JWT_SECRET`, and a strong `ADMIN_PASSWORD` for your machine.
4. From this directory, install packages and create the schema:

   ```bash
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run db:seed
   npm run dev
   ```

The migration creates the `users`, `complaints`, `images`, and `detections` tables. The seed creates the admin account and sample complaints only when the complaints table is empty; it does not erase existing complaints. Admin login is `admin@complaints.com` with the password set in `ADMIN_PASSWORD`.

The backend requires MySQL to be running and the database to exist before migrations or startup. `DATABASE_URL` must use the Prisma MySQL format, for example `mysql://root:password@localhost:3306/pothole_db`.
