using MecaFlow.Api.Data;
using MecaFlow.Api.DTOs;
using MecaFlow.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MecaFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController(AppDbContext db) : ControllerBase
{
    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")!.Value);

    [HttpGet]
    public async Task<IEnumerable<CustomerDto>> GetAll([FromQuery] string? search)
    {
        var query = db.Customers
            .Where(c => c.TenantId == TenantId)
            .Include(c => c.Vehicles)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var lower = search.ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(lower) || c.Phone.Contains(search));
        }

        return await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CustomerDto(c.Id, c.Name, c.Phone, c.Email, c.CreatedAt, c.Vehicles.Count))
            .ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> GetById(Guid id)
    {
        var c = await db.Customers
            .Include(x => x.Vehicles)
            .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId);
        if (c is null) return NotFound();
        return new CustomerDto(c.Id, c.Name, c.Phone, c.Email, c.CreatedAt, c.Vehicles.Count);
    }

    [HttpPost]
    public async Task<ActionResult<CustomerDto>> Create(CreateCustomerDto dto)
    {
        var customer = new Customer { TenantId = TenantId, Name = dto.Name, Phone = dto.Phone, Email = dto.Email };
        db.Customers.Add(customer);
        await db.SaveChangesAsync();
        var result = new CustomerDto(customer.Id, customer.Name, customer.Phone, customer.Email, customer.CreatedAt, 0);
        return CreatedAtAction(nameof(GetById), new { id = customer.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> Update(Guid id, CreateCustomerDto dto)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == TenantId);
        if (customer is null) return NotFound();

        customer.Name = dto.Name;
        customer.Phone = dto.Phone;
        customer.Email = dto.Email;
        await db.SaveChangesAsync();

        var vehicleCount = await db.Vehicles.CountAsync(v => v.CustomerId == id);
        return new CustomerDto(customer.Id, customer.Name, customer.Phone, customer.Email, customer.CreatedAt, vehicleCount);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == TenantId);
        if (customer is null) return NotFound();
        db.Customers.Remove(customer);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
