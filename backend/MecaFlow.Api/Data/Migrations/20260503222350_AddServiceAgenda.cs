using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TallerTotal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceAgenda : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ServiceDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    StorageUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ParsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VehicleLicensePlate = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    VehicleDescription = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServiceDocuments_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ServiceScheduleEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceDocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceType = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    LastServiceDate = table.Column<DateOnly>(type: "date", nullable: true),
                    IntervalMonths = table.Column<int>(type: "integer", nullable: true),
                    IntervalKm = table.Column<int>(type: "integer", nullable: true),
                    NextDueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LastAlertSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceScheduleEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServiceScheduleEntries_ServiceDocuments_ServiceDocumentId",
                        column: x => x.ServiceDocumentId,
                        principalTable: "ServiceDocuments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceDocuments_TenantId",
                table: "ServiceDocuments",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceScheduleEntries_ServiceDocumentId",
                table: "ServiceScheduleEntries",
                column: "ServiceDocumentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ServiceScheduleEntries");

            migrationBuilder.DropTable(
                name: "ServiceDocuments");
        }
    }
}
