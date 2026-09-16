"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

/** A password field with a show/hide toggle. Takes the same props as an input. */
export function PasswordInput(props: Omit<React.ComponentProps<typeof InputGroupInput>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup>
      <InputGroupInput {...props} type={visible ? "text" : "password"} />
      <InputGroupAddon align="inline-end">
        {/* A toggle keeps one label and reports its state through aria-pressed. */}
        <InputGroupButton
          size="icon-xs"
          aria-label="Show password"
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
