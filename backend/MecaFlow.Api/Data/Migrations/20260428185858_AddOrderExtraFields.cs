using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TallerTotal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderExtraFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EstimatedDeliveryAt",
                table: "ServiceOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InternalNotes",
                table: "ServiceOrders",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EstimatedDeliveryAt",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "InternalNotes",
                table: "ServiceOrders");
        }
    }
}
