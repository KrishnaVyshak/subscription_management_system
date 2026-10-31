export async function findProfileByEmail(db, email) {
  const { rows } = await db.query('select * from profiles where lower(email) = lower($1)', [email]);
  return rows[0] ?? null;
}

export async function insertProfile(db, { id, email, fullName, role }) {
  const { rows } = await db.query(
    `insert into profiles (id, email, full_name, role) values ($1, $2, $3, $4) returning *`,
    [id, email, fullName, role],
  );
  return rows[0];
}

export async function updateProfileName(db, id, fullName) {
  const { rows } = await db.query('update profiles set full_name = $2 where id = $1 returning *', [
    id,
    fullName,
  ]);
  return rows[0];
}

// Links a staff-created customer with the same email, or creates one.
export async function linkOrCreateCustomer(db, { profileId, email, name, phone }) {
  const linked = await db.query(
    `update customers set profile_id = $1, phone = coalesce(phone, $3)
      where lower(email) = lower($2) and profile_id is null
      returning id`,
    [profileId, email, phone ?? null],
  );
  if (linked.rows[0]) return linked.rows[0].id;
  const created = await db.query(
    `insert into customers (profile_id, name, email, phone, created_by)
     values ($1, $2, $3, $4, $1) returning id`,
    [profileId, name, email, phone ?? null],
  );
  return created.rows[0].id;
}
