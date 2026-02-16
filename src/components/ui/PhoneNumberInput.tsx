import { Select } from "antd";
import { commonCountries } from "@/data/defaultData";
import { useState } from "react";

const { Option } = Select;

interface PhoneNumberInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PhoneNumberInput({
  value,
  onChange,
  placeholder = "98765 43210",
  className = "",
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
    <div className={`flex items-center transition-all focus-within:ring-0 overflow-hidden ${className}`}>
      <Select
        value={countryCode}
        onChange={handleCountryCodeChange}
        className="w-[80px] phone-code-select bg-transparent border-none"
        suffixIcon={<div className="text-gray-400 text-xs">▼</div>}
        popupMatchSelectWidth={300}
        optionLabelProp="label"
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
      <div className="w-[1px] h-6 bg-gray-200"></div>
      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        maxLength={15}
        className="flex-1 bg-transparent border-none outline-none px-3 font-medium text-black placeholder:text-gray-300 h-full w-full"
      />

    </div>
  );
}
