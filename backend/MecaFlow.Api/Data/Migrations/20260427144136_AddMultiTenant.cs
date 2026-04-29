using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TallerTotal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiTenant : Migration
    {
        /// <inheritdoc />
        // Default tenant ID assigned to all existing data
        private static readonly Guid DefaultTenantId = new("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Create Tenants first
            migrationBuilder.CreateTable(
                name: "Tenants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.Id);
                });

            // 2. Seed default tenant
            migrationBuilder.InsertData(
                table: "Tenants",
                columns: ["Id", "Name", "IsActive", "CreatedAt"],
                values: new object[] { DefaultTenantId, "Taller Demo", true, DateTime.UtcNow });

            // 3. Add TenantId to Customers with default = seed tenant
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Customers",
                type: "uuid",
                nullable: false,
                defaultValue: DefaultTenantId);

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Username = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Customers_TenantId",
                table: "Customers",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_TenantId_Username",
                table: "Users",
                columns: new[] { "TenantId", "Username" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Customers_Tenants_TenantId",
                table: "Customers",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Customers_Tenants_TenantId",
                table: "Customers");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Tenants");

            migrationBuilder.DropIndex(
                name: "IX_Customers_TenantId",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Customers");
        }
    }
}
