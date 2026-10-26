import type { AddressErrors, AddressValues } from './validation';

interface AddressFieldsProps {
  idPrefix: string;
  value: AddressValues;
  errors: AddressErrors;
  disabled: boolean;
  onChange: (field: keyof AddressValues, value: string) => void;
}

export default function AddressFields({
  idPrefix,
  value,
  errors,
  disabled,
  onChange,
}: AddressFieldsProps) {
  const field = (
    name: keyof AddressValues,
    label: string,
    options: {
      autoComplete?: string;
      maxLength?: number;
      optional?: boolean;
      hint?: string;
    } = {},
  ) => {
    const id = `${idPrefix}-${name}`;
    const error = errors[name];
    const describedBy = error ? `${id}-error` : options.hint ? `${id}-hint` : undefined;

    return (
      <div className="checkout-field">
        <label className="checkout-field__label" htmlFor={id}>
          {label}
          {options.optional && <span className="checkout-field__optional"> (optional)</span>}
        </label>
        <input
          id={id}
          className="checkout-field__input"
          type="text"
          value={value[name]}
          autoComplete={options.autoComplete}
          maxLength={options.maxLength}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(name, event.target.value)}
        />
        {options.hint && !error && (
          <p className="checkout-field__hint" id={`${id}-hint`}>
            {options.hint}
          </p>
        )}
        {error && (
          <p className="checkout-field__error" id={`${id}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="checkout-fields">
      {field('line1', 'Address line 1', { autoComplete: 'address-line1', maxLength: 120 })}
      {field('line2', 'Address line 2', {
        autoComplete: 'address-line2',
        maxLength: 120,
        optional: true,
      })}
      {field('city', 'City', { autoComplete: 'address-level2', maxLength: 80 })}
      {field('postalCode', 'Postcode', { autoComplete: 'postal-code', maxLength: 12 })}
      {field('country', 'Country', {
        autoComplete: 'country',
        maxLength: 2,
        hint: 'Two-letter country code, e.g. GB',
      })}
    </div>
  );
}
