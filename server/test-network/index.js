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
        "Chris",
        "Liam",
        "Maya",
        "Noah",
        "Chuck",
        "Sri",
        "Olivia",
        "Emma",
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
      ];
      const nameMatrix = firstNames.flatMap((first) =>
        lastNames.map((last) => `${first} ${last}`)
      );
      const names = [
        "Sam Altman",
        "Ilya Sutskever",
        "Greg Brockman",
        "Wojciech Zaremba",
        "Jakub Pachocki",
        "Mira Murati",
        "Andrej Karpathy",
        "Dario Amodei",
        "John Schulman",
        "Sarah Friar",
        ...nameMatrix,
      ];
      const departments = ["HR", "Finance", "Research"];
      const deptTitles = {
        HR: ["Head of HR", "Ops Lead"],
        Finance: ["Chief Financial Officer (CFO)", "Finance Manager"],
        Research: [
          "Chief Technology Officer (CTO)",
          "Chief Scientist",
          "Product Manager",
          "Design Lead",
          "Growth Manager",
          "Engineering Manager",
          "Senior UI/UX Designer",
          "Senior Software Engineer",
          "Senior Data Scientist",
          "Senior ML Engineer",
          "Senior AI Research Scientist",
        ],
      };
      const deptIndex = {
        HR: 0,
        Finance: 0,
        Research: 0,
      };

      const randomPick = (values) =>
        values[Math.floor(Math.random() * values.length)];

      const createdAt = new Date().toISOString();
      const users = Array.from(
        {
          length: count,
        },
        () => {
          const id = crypto.randomUUID();
          const name = randomPick(names);
          const dept = randomPick(departments);
          Math.random() < 0.3 &&
            (deptIndex[dept] = Math.min(
              deptIndex[dept] + 1,
              deptTitles[dept].length - 1
            ));
          return {
            id,
            email: `${name
              .toLowerCase()
              .replace(" ", ".")
              .slice(0, 6)}}@openai.com`,
            name,
            department: dept,
            role_title: deptTitles[dept][deptIndex[dept]],
            role: "employee",
            approval_status: "approved",
            created_at: createdAt,
          };
        }
      );

      const managerIds = users.map((user, index) =>
        index === 0
          ? null
          : randomPick(
              users.filter(
                (u, i) => u.department == user.department && i < index
              )
            )?.id || null
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
        MERGE (r:UserRole { role: user.role })
        MERGE (u)-[:HAS_USER_ROLE]->(r)
        MERGE (d:Department { name: user.department })
        MERGE (u)-[:IN_DEPARTMENT]->(d)
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
