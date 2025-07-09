
// Sistema centralizado de validação
class ValidationSystem {
    constructor() {
        this.rules = {};
        this.setupDefaultRules();
    }
    
    setupDefaultRules() {
        this.rules = {
            required: (value) => value !== null && value !== undefined && value !== '',
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            phone: (value) => /^\(?[1-9]{2}\)?\s?9?\d{4}-?\d{4}$/.test(value),
            cpf: (value) => this.validateCPF(value),
            cnpj: (value) => this.validateCNPJ(value),
            number: (value) => !isNaN(parseFloat(value)) && isFinite(value),
            positiveNumber: (value) => this.rules.number(value) && parseFloat(value) > 0,
            minLength: (length) => (value) => value && value.length >= length,
            maxLength: (length) => (value) => !value || value.length <= length,
            min: (min) => (value) => this.rules.number(value) && parseFloat(value) >= min,
            max: (max) => (value) => this.rules.number(value) && parseFloat(value) <= max
        };
    }
    
    validate(data, schema) {
        const errors = {};
        const sanitized = {};
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            sanitized[field] = this.sanitizeValue(value, rules.type);
            
            for (const rule of rules.rules || []) {
                if (!this.executeRule(rule, sanitized[field])) {
                    if (!errors[field]) errors[field] = [];
                    errors[field].push(this.getErrorMessage(field, rule));
                }
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors,
            sanitized
        };
    }
    
    sanitizeValue(value, type) {
        if (value === null || value === undefined) return value;
        
        switch (type) {
            case 'string':
                return String(value).trim();
            case 'number':
                return parseFloat(value);
            case 'integer':
                return parseInt(value);
            case 'boolean':
                return Boolean(value);
            case 'date':
                return new Date(value);
            default:
                return value;
        }
    }
    
    executeRule(rule, value) {
        if (typeof rule === 'string') {
            return this.rules[rule] ? this.rules[rule](value) : true;
        } else if (typeof rule === 'object') {
            const { name, params } = rule;
            return this.rules[name] ? this.rules[name](...params)(value) : true;
        } else if (typeof rule === 'function') {
            return rule(value);
        }
        return true;
    }
    
    getErrorMessage(field, rule) {
        const messages = {
            required: `${field} é obrigatório`,
            email: `${field} deve ser um email válido`,
            phone: `${field} deve ser um telefone válido`,
            cpf: `${field} deve ser um CPF válido`,
            cnpj: `${field} deve ser um CNPJ válido`,
            number: `${field} deve ser um número`,
            positiveNumber: `${field} deve ser um número positivo`
        };
        
        const ruleName = typeof rule === 'string' ? rule : rule.name;
        return messages[ruleName] || `${field} é inválido`;
    }
    
    validateCPF(cpf) {
        if (!cpf) return false;
        cpf = cpf.replace(/[^\d]/g, '');
        if (cpf.length !== 11) return false;
        
        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1{10}$/.test(cpf)) return false;
        
        // Validação do primeiro dígito
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf[i]) * (10 - i);
        }
        let digit1 = (sum * 10) % 11;
        if (digit1 === 10) digit1 = 0;
        
        // Validação do segundo dígito
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf[i]) * (11 - i);
        }
        let digit2 = (sum * 10) % 11;
        if (digit2 === 10) digit2 = 0;
        
        return parseInt(cpf[9]) === digit1 && parseInt(cpf[10]) === digit2;
    }
    
    validateCNPJ(cnpj) {
        if (!cnpj) return false;
        cnpj = cnpj.replace(/[^\d]/g, '');
        if (cnpj.length !== 14) return false;
        
        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1{13}$/.test(cnpj)) return false;
        
        // Validação do primeiro dígito
        let length = cnpj.length - 2;
        let numbers = cnpj.substring(0, length);
        const digits = cnpj.substring(length);
        let sum = 0;
        let pos = length - 7;
        
        for (let i = length; i >= 1; i--) {
            sum += numbers.charAt(length - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        if (result !== parseInt(digits.charAt(0))) return false;
        
        // Validação do segundo dígito
        length = length + 1;
        numbers = cnpj.substring(0, length);
        sum = 0;
        pos = length - 7;
        
        for (let i = length; i >= 1; i--) {
            sum += numbers.charAt(length - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        return result === parseInt(digits.charAt(1));
    }
    
    // Método para validar formulários HTML
    validateForm(formElement, schema) {
        const formData = new FormData(formElement);
        const data = Object.fromEntries(formData.entries());
        
        const result = this.validate(data, schema);
        
        // Remove classes de erro anteriores
        formElement.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        
        formElement.querySelectorAll('.invalid-feedback').forEach(el => {
            el.remove();
        });
        
        // Adiciona classes de erro e mensagens
        if (!result.isValid) {
            for (const [field, fieldErrors] of Object.entries(result.errors)) {
                const input = formElement.querySelector(`[name="${field}"]`);
                if (input) {
                    input.classList.add('is-invalid');
                    
                    const feedback = document.createElement('div');
                    feedback.className = 'invalid-feedback';
                    feedback.textContent = fieldErrors.join(', ');
                    input.parentNode.appendChild(feedback);
                }
            }
        }
        
        return result;
    }
}

// Inicializa o sistema de validação globalmente
window.validator = new ValidationSystem();
