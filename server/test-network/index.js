export const registerTestNetworkRoutes = ({
  app,
  runQuery,
  mapNode,
  jsonError,
  crypto,
}) => {
  app.post("/api/org-network/seed-users", async (req, res) => {
    try {
      const requestedCount = Number(req.body.count);
      const count = Number.isFinite(requestedCount)
        ? Math.max(1, Math.min(requestedCount, 50))
        : 8;

      const firstNames = [
        "Ava",
        "Liam",
        "Maya",
        "Noah",
        "Ethan",
        "Zoe",
        "Kai",
        "Nora",
        "Aria",
        "Leo",
        "Mila",
        "Iris",
      ];
      const lastNames = [
        "Nguyen",
        "Patel",
        "Garcia",
        "Kim",
        "Chen",
        "Diaz",
        "Khan",
        "Ali",
        "Lopez",
        "Brown",
        "Singh",
        "Rivera",
      ];
      const departments = ["HR", "Finance", "Research"];
      const titles = [
        "Staff Engineer",
        "Product Manager",
        "Ops Lead",
        "Design Lead",
        "Growth Manager",
        "Finance Manager",
        "Engineering Manager",
      ];

      const randomPick = (values) =>
        values[Math.floor(Math.random() * values.length)];

      const createdAt = new Date().toISOString();
      const users = Array.from({ length: count }, () => {
        const first = randomPick(firstNames);
        const last = randomPick(lastNames);
        const id = crypto.randomUUID();
        const name = `${first} ${last}`;
        return {
          id,
          email: `${first.toLowerCase()}.${last.toLowerCase()}-${id.slice(
            0,
            6
          )}@example.com`,
          name,
          department: randomPick(departments),
          role_title: randomPick(titles),
          role: "employee",
          approval_status: "approved",
          created_at: createdAt,
        };
      });

      const managerIds = users.map((user, index) =>
        index === 0
          ? null
          : users[Math.floor(Math.random() * index)]?.id || null
      );

      await runQuery(
        `
        UNWIND $users AS user
        CREATE (u:User {
          id: user.id,
          email: user.email,
          full_name: user.name,
          name: user.name,
          department: user.department,
          role_title: user.role_title,
          approval_status: user.approval_status,
          created_at: user.created_at
        })
        WITH u, user
        MERGE (r:UserRole { user_id: user.id })
        ON CREATE SET r.role = user.role
        MERGE (u)-[:HAS_USER_ROLE]->(r)
        `,
        {
          users,
        }
      );

      await runQuery(
        `
        UNWIND $relations AS relation
        MATCH (u:User { id: relation.userId })
        SET u.approved_by = relation.managerId,
            u.approved_at = $approvedAt
        `,
        {
          relations: users.map((user, index) => ({
            userId: user.id,
            managerId: managerIds[index],
          })),
          approvedAt: createdAt,
        }
      );

      res.json({
        created: count,
      });
    } catch (error) {
      console.error("Org network seed failed:", error);
      jsonError(res, 500, "Failed to seed org network.");
    }
  });
};