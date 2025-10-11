export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface FormFieldState {
  value: string;
  error: string | null;
  touched: boolean;
}

export interface FormState {
  [key: string]: FormFieldState;
}

// Validation rules
export const validationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => {
      if (!value.includes('@')) return 'Please enter a valid email address';
      if (value.length < 5) return 'Email address is too short';
      return null;
    },
  } as ValidationRule,

  password: {
    required: true,
    minLength: 6,
    custom: (value: string) => {
      if (value.length < 6) return 'Password must be at least 6 characters long';
      if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
      if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
      return null;
    },
  } as ValidationRule,

  confirmPassword: (originalPassword: string): ValidationRule => ({
    required: true,
    custom: (value: string) => {
      if (value !== originalPassword) return 'Passwords do not match';
      return null;
    },
  }),

  fullName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    custom: (value: string) => {
      if (value.trim().length < 2) return 'Full name must be at least 2 characters';
      if (!/^[a-zA-Z\s]+$/.test(value)) return 'Full name can only contain letters and spaces';
      return null;
    },
  } as ValidationRule,

  required: {
    required: true,
    custom: (value: string) => {
      if (!value.trim()) return 'This field is required';
      return null;
    },
  } as ValidationRule,
};

// Validate single field
export function validateField(value: string, rules: ValidationRule): ValidationResult {
  // Required validation
  if (rules.required && !value.trim()) {
    return {
      isValid: false,
      error: 'This field is required',
    };
  }

  // Skip other validations if field is empty and not required
  if (!value.trim() && !rules.required) {
    return {
      isValid: true,
      error: null,
    };
  }

  // Min length validation
  if (rules.minLength && value.length < rules.minLength) {
    return {
      isValid: false,
      error: `Must be at least ${rules.minLength} characters long`,
    };
  }

  // Max length validation
  if (rules.maxLength && value.length > rules.maxLength) {
    return {
      isValid: false,
      error: `Must be no more than ${rules.maxLength} characters long`,
    };
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    return {
      isValid: false,
      error: 'Invalid format',
    };
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      return {
        isValid: false,
        error: customError,
      };
    }
  }

  return {
    isValid: true,
    error: null,
  };
}

// Validate entire form
export function validateForm(
  formState: FormState,
  fieldRules: Record<string, ValidationRule>
): boolean {
  let isValid = true;

  for (const fieldName in fieldRules) {
    const fieldState = formState[fieldName];
    if (!fieldState) continue;

    const validation = validateField(fieldState.value, fieldRules[fieldName]);
    if (!validation.isValid) {
      isValid = false;
    }
  }

  return isValid;
}

// Helper function to get first error from form
export function getFirstFormError(formState: FormState): string | null {
  for (const fieldName in formState) {
    const fieldState = formState[fieldName];
    if (fieldState.error && fieldState.touched) {
      return fieldState.error;
    }
  }
  return null;
}

// Helper function to check if form has any errors
export function hasFormErrors(formState: FormState): boolean {
  for (const fieldName in formState) {
    const fieldState = formState[fieldName];
    if (fieldState.error) {
      return true;
    }
  }
  return false;
}

// Helper function to get all touched errors
export function getTouchedErrors(formState: FormState): string[] {
  const errors: string[] = [];
  for (const fieldName in formState) {
    const fieldState = formState[fieldName];
    if (fieldState.error && fieldState.touched) {
      errors.push(fieldState.error);
    }
  }
  return errors;
}
