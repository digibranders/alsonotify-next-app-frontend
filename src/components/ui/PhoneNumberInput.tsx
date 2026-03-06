import { Select, Input, Space } from "antd";
import { commonCountries } from "@/data/defaultData";
import { useState } from "react";

const { Option } = Select;

interface PhoneNumberInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function PhoneNumberInput({
  value,
  onChange,
  placeholder = "98765 43210",
  className = "",
  disabled = false,
}: PhoneNumberInputProps) {
  // Parse initial value if it contains a country code
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Track previous value to handle prop changes
  const [prevValue, setPrevValue] = useState(value);

  // Update state during render if value prop changes
  if (value !== prevValue) {
    setPrevValue(value);
    
    const matchingCountry = commonCountries.find((c) =>
      value && value.startsWith(c.phoneCode + " ")
    );

    if (matchingCountry && value) {
      setCountryCode(matchingCountry.phoneCode);
      setPhoneNumber(value.replace(matchingCountry.phoneCode + " ", ""));
    } else {
      setCountryCode("+91");
      setPhoneNumber(value || "");
    }
  }

  const handleCountryCodeChange = (code: string) => {
    setCountryCode(code);
    onChange?.(`${code} ${phoneNumber}`);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replaceAll(/\D/g, ""); // Allow only digits
    setPhoneNumber(newNumber);
    onChange?.(newNumber ? `${countryCode} ${newNumber}` : "");
  };

  return (
    <Space.Compact className={`w-full ${className}`}>
      <Select
        value={countryCode}
        onChange={handleCountryCodeChange}
        disabled={disabled}
        className="phone-code-select min-w-[85px] h-11"
        popupMatchSelectWidth={300}
        optionLabelProp="label"
        suffixIcon={<div className="text-gray-400">⌄</div>}
      >
        {commonCountries.map((country) => (
          <Option 
            key={country.code} 
            value={country.phoneCode}
            label={country.phoneCode}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 w-10">{country.phoneCode}</span>
              <span className="text-gray-500 truncate">{country.name}</span>
            </div>
          </Option>
        ))}
      </Select>
      <Input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        maxLength={15}
        disabled={disabled}
        className="h-11 phone-number-input flex-1"
      />
    </Space.Compact>
  );
}
