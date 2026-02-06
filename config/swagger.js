const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Assets Manager API',
    version: '1.0.0',
    description: 'A comprehensive API for managing organizational assets, users, departments, and transactions',
    contact: {
      name: 'API Support',
      email: 'support@assetsmanager.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.assetsmanager.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Error message'
          },
          errors: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['Validation error details']
          }
        }
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Operation successful'
          },
          data: {
            type: 'object',
            description: 'Response data'
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          user_id: {
            type: 'integer',
            example: 1
          },
          employee_id: {
            type: 'string',
            example: 'EMP001'
          },
          first_name: {
            type: 'string',
            example: 'John'
          },
          last_name: {
            type: 'string',
            example: 'Doe'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'john.doe@company.com'
          },
          role: {
            type: 'string',
            enum: ['admin', 'manager', 'employee'],
            example: 'employee'
          },
          department_id: {
            type: 'integer',
            example: 1
          },
          is_active: {
            type: 'boolean',
            example: true
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      Asset: {
        type: 'object',
        properties: {
          asset_id: {
            type: 'integer',
            example: 1
          },
          asset_tag: {
            type: 'string',
            example: 'AST001'
          },
          name: {
            type: 'string',
            example: 'Dell Laptop'
          },
          description: {
            type: 'string',
            example: 'Dell Latitude 5520 Laptop'
          },
          category_id: {
            type: 'integer',
            example: 1
          },
          status: {
            type: 'string',
            enum: ['available', 'assigned', 'maintenance', 'retired'],
            example: 'available'
          },
          assigned_to: {
            type: 'integer',
            example: 1
          },
          purchase_date: {
            type: 'string',
            format: 'date'
          },
          purchase_price: {
            type: 'number',
            format: 'float',
            example: 1200.00
          },
          location: {
            type: 'string',
            example: 'Office Building A, Floor 2'
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      Department: {
        type: 'object',
        properties: {
          department_id: {
            type: 'integer',
            example: 1
          },
          name: {
            type: 'string',
            example: 'IT Department'
          },
          description: {
            type: 'string',
            example: 'Information Technology Department'
          },
          manager_id: {
            type: 'integer',
            example: 1
          },
          is_active: {
            type: 'boolean',
            example: true
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      AssetCategory: {
        type: 'object',
        properties: {
          category_id: {
            type: 'integer',
            example: 1
          },
          name: {
            type: 'string',
            example: 'Laptops'
          },
          description: {
            type: 'string',
            example: 'Portable computers and laptops'
          },
          is_active: {
            type: 'boolean',
            example: true
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      AssetTransaction: {
        type: 'object',
        properties: {
          transaction_id: {
            type: 'integer',
            example: 1
          },
          asset_id: {
            type: 'integer',
            example: 1
          },
          user_id: {
            type: 'integer',
            example: 1
          },
          transaction_type: {
            type: 'string',
            enum: ['assignment', 'return', 'maintenance', 'retirement'],
            example: 'assignment'
          },
          notes: {
            type: 'string',
            example: 'Assigned to new employee'
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'john.doe@company.com'
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'password123'
          }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['employee_id', 'first_name', 'last_name', 'email', 'password', 'department_id'],
        properties: {
          employee_id: {
            type: 'string',
            example: 'EMP001'
          },
          first_name: {
            type: 'string',
            example: 'John'
          },
          last_name: {
            type: 'string',
            example: 'Doe'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'john.doe@company.com'
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'password123'
          },
          department_id: {
            type: 'integer',
            example: 1
          },
          role: {
            type: 'string',
            enum: ['admin', 'manager', 'employee'],
            example: 'employee'
          }
        }
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['current_password', 'new_password'],
        properties: {
          current_password: {
            type: 'string',
            format: 'password',
            example: 'oldpassword123'
          },
          new_password: {
            type: 'string',
            format: 'password',
            example: 'newpassword123'
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

// Options for the swagger docs
const options = {
  swaggerDefinition,
  apis: [
    './routes/*.js',
    './controllers/*.js'
  ]
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  swaggerSpec,
  swaggerUi
};
