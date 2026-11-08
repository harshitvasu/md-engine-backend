# React Js 30 Practical Questions

-   What is Vite, and how do I create and run a React application with it?
    
-   What is a React component, and how do I create one?
    
-   How does JSX work, and what can I write inside JSX?
    
-   How do I pass data from a parent component to a child component using props?
    
-   How do I handle button clicks and other events in React?
    
-   How do I use `useState` to make a component interactive?
    
-   How do I build a controlled input using React state?
    
-   How do I build and submit a form in React?
    
-   How do I validate form input and display validation errors?
    
-   How do I render an array of objects as a list of React components?
    
-   Why does React need a `key` when rendering lists?
    
-   How do I conditionally render different components or UI elements?
    
-   How do I fetch data from a Node.js API and display it in React?
    
-   How do I handle loading, success, empty, and error states for an API request?
    
-   What is `useEffect`, and how do I use it to fetch data?
    
-   How does the `useEffect` dependency array work?
    
-   How do I create multiple pages in React using routes?
    
-   What is the difference between React Router navigation and a normal `<a>` link?
    
-   How do I create a dynamic route such as `/products/:id`?
    
-   Why does a React frontend on port 3000 get CORS errors when calling a Node backend on port 4444, and how does the Vite proxy solve it?
    
-   How do I organize API calls into a separate service layer instead of putting `fetch()` inside every component?
    
-   How do I share state between components without passing props through multiple levels?
    
-   How do I use Context API for authentication, theme, or cart state?
    
-   How do I build login, logout, and protected routes in React?
    
-   Why does a React component re-render, and how can I find out what caused a re-render?
    
-   When should I use `React.memo`, `useMemo`, and `useCallback`?
    
-   How do I prevent race conditions when multiple API requests are triggered by a search box?
    
-   How do I build a search, filter, sorting, and pagination interface that works with a backend API?
    
-   How do I build a complete Job Tracker application using React, Vite, React Router, and a Node.js backend?
    
-   How would I debug and optimize the Job Tracker if it had slow renders, repeated API calls, race conditions, broken routes, and unnecessary component complexity?
    

---

### What is Vite, and how do I create and run a React application with it?

**Vite** (pronounced "veet," French for "quick") is a modern, blazing-fast frontend build tool and development server created by Evan You (the creator of Vue.js). In the React ecosystem, it has largely replaced the older Create React App (CRA) because it offers nearly instant server startup and incredibly fast Hot Module Replacement (HMR).

Instead of rebuilding your entire application every time you save a file, Vite leverages native ES modules in the browser to only update the exact file you changed, making the development experience much smoother.

---

### What is a React component, and how do I create one?

A **React component** is an independent, reusable piece of a user interface. Think of it like a custom HTML tag or a LEGO block. Instead of building an entire webpage in one massive file, React lets you break the UI down into small, isolated pieces—like a `Navbar`, a `Sidebar`, or a `UserProfile`—and then snap them together to form the complete application.

---
## How does JSX work, and what can I write inside JSX?

**JSX (JavaScript XML)** is a syntax extension for JavaScript that lets you write HTML-like markup directly inside your JavaScript files. It is what makes React components so intuitive to write, keeping the rendering logic (JavaScript) and the UI structure (HTML) in the same place.

### How JSX Works Under the Hood

Browsers do not understand JSX. If you try to run it directly in a browser, you will get a syntax error.

Behind the scenes, build tools like Vite (using compilers like Babel or SWC) translate your JSX into standard JavaScript function calls before sending it to the browser.

For example, this JSX:

    <h1 className="greeting">Hello World</h1>
    

Is compiled into this plain JavaScript:

    import { jsx as _jsx } from "react/jsx-runtime";
    
    _jsx("h1", { className: "greeting", children: "Hello World" });
    

### What You Can Write Inside JSX

JSX is stricter than HTML and has a few specific rules, but it gives you the full power of JavaScript right inside your markup.

**1\. JavaScript Expressions (Using Curly Braces `{}` )**

You can embed any valid JavaScript **expression** inside JSX by wrapping it in curly braces. An expression is anything that evaluates to a single value.

    export function UserProfile() {
      const name = "Jane Doe";
      const age = 28;
      const avatarUrl = "https://example.com/avatar.png";
    
      return (
        <div>
          {/* Strings and variables */}
          <h1>{name}</h1> 
          
          {/* Math and logic */}
          <p>Next year you will be {age + 1}</p> 
          
          {/* Function calls */}
          <p>Name in uppercase: {name.toUpperCase()}</p>
          
          {/* Using variables for attributes */}
          <img src={avatarUrl} alt={name} /> 
        </div>
      );
    }
    

_Note: You cannot put JavaScript_ **_statements_** _(like_ `_if_`_,_ `_for_`_, or_ `_switch_`_) directly inside JSX curly braces. You must use expressions (like ternary operators_ `_? :_` _or array methods like_ `_.map()_`_)._

**2\. The 3 Golden Rules of JSX Syntax**

-   **Return a Single Root Element:** A component can only return one top-level tag. If you have multiple elements, wrap them in a parent `<div>` or an empty tag called a Fragment (`<> ... </>`), which groups them without adding extra HTML nodes to the browser.
    
        // WRONG: Returns two sibling tags
        return (
          <h1>Title</h1>
          <p>Description</p>
        );
        
        // CORRECT: Wrapped in a Fragment
        return (
          <>
            <h1>Title</h1>
            <p>Description</p>
          </>
        );
        
    
-   **Close All Tags:** In HTML, tags like `<img>` or `<input>` can be left open. In JSX, every tag must be explicitly closed. If a tag has no children, you must self-close it with a forward slash.
    
        // CORRECT
        <img src="logo.png" />
        <input type="text" />
        <br />
        
    
-   **camelCase Most Attributes:** Because JSX is JavaScript, and words like `class` and `for` are reserved words in JavaScript, React uses camelCase for HTML attributes.
    
    -   `class` becomes `className`
        
    -   `for` becomes `htmlFor`
        
    -   `onclick` becomes `onClick`
        
    -   `tabindex` becomes `tabIndex`
        

JavaScript

    // HTML: <div class="card" onclick="handleClick()">
    // JSX:
    <div className="card" onClick={handleClick}>
    

---
## How do I pass data from a parent component to a child component using props?

### 1\. The Parent (Sending the Data)

In the parent component, you pass data to the child by adding attributes to the child's tag.

-   **Strings** can be passed in standard quotes.
    
-   **Numbers, booleans, variables, and arrays/objects** must be wrapped in curly braces `{}`.
    

JavaScript

    // ParentComponent.jsx
    import { UserCard } from './UserCard';
    
    export function ParentComponent() {
      const userAge = 28;
      const userSkills = ["React", "JavaScript", "CSS"];
    
      return (
        <div className="dashboard">
          <h1>User Dashboard</h1>
          
          {/* Passing different types of data as props */}
          <UserCard 
            name="Alex" 
            age={userAge} 
            isActive={true}
            skills={userSkills}
          />
        </div>
      );
    }
    

### 2\. The Child (Receiving the Data)

In the child component, React packages all those attributes into a single object called `props` and passes it as the first argument to your component function.

**Method A: The standard `props` object**

You can access the data by typing [`props.name`](http://props.name), `props.age`, etc.

    // UserCard.jsx
    export function UserCard(props) {
      return (
        <div className="card">
          <h2>Name: {props.name}</h2>
          <p>Age: {props.age}</p>
          <p>Status: {props.isActive ? "Online" : "Offline"}</p>
          <p>Top Skill: {props.skills[0]}</p>
        </div>
      );
    }
    

**Method B: Object Destructuring (The standard approach)**

Instead of repeating `props.` over and over, most React developers use JavaScript object destructuring right in the function parameters. This pulls the specific variables out of the props object instantly, making your code much cleaner to read.

    // UserCard.jsx
    export function UserCard({ name, age, isActive, skills }) {
      return (
        <div className="card">
          <h2>Name: {name}</h2>
          <p>Age: {age}</p>
          <p>Status: {isActive ? "Online" : "Offline"}</p>
          <p>Top Skill: {skills[0]}</p>
        </div>
      );
    }
    

### Passing Functions as Props

Because props can be _any_ valid JavaScript expression, you can even pass functions down to child components. This is how a child component can "talk back" to a parent—by calling a function that the parent provided.

    // Parent
    function Parent() {
      const sayHello = () => alert("Hello from the parent!");
      return <Button onClickProp={sayHello} />;
    }
    
    // Child
    function Button({ onClickProp }) {
      // Clicking the button triggers the parent's function
      return <button onClick={onClickProp}>Click Me</button>;
    }
    

---
## How do I handle button clicks and other events in React?

Handling events in React is very similar to handling events on standard DOM elements, but with two key syntactic differences:

1.  **camelCase Naming:** React events are named using camelCase, rather than lowercase (e.g., `onClick` instead of `onclick`, `onChange` instead of `onchange`).
    
2.  **Function References:** With JSX, you pass a function _reference_ as the event handler, rather than a string.
    

### 1\. Basic Event Handling

To handle a click, define a function inside your component and pass it to the element's `onClick` prop without parentheses.

    export function Button() {
      function handleClick() {
        alert("Button was clicked!");
      }
    
      // CORRECT: Pass the function reference (no parentheses)
      return <button onClick={handleClick}>Click Me</button>;
      
      // WRONG: Adding () calls the function immediately when the component renders
      // return <button onClick={handleClick()}>Click Me</button>; 
    }
    

### 2\. Passing Arguments to Event Handlers

If you need to pass a specific value into your event handler (like an ID), you cannot write `onClick={handleDelete(id)}` because that would execute the function immediately upon render.

Instead, wrap it in an inline arrow function. This tells React, "Create this function now, but only run it when the user actually clicks."

    export function UserList() {
      function handleDelete(userId) {
        console.log("Deleting user:", userId);
      }
    
      return (
        <ul>
          <li>
            Alice 
            {/* An inline arrow function delays execution until the click happens */}
            <button onClick={() => handleDelete(1)}>Delete</button>
          </li>
          <li>
            Bob 
            <button onClick={() => handleDelete(2)}>Delete</button>
          </li>
        </ul>
      );
    }
    

### 3\. Reading the Event Object (e)

Just like in standard JavaScript, React event handlers automatically receive an event object as their first argument (often written as `e` or `event`). This is a "SyntheticEvent," a cross-browser wrapper React creates around the native browser event.

This is most commonly used to read what a user is typing into an input field using `onChange` and [`e.target`](http://e.target)`.value`.

    export function SearchInput() {
      function handleInputChange(e) {
        // e.target is the <input> element, and .value is what the user typed
        console.log("User typed:", e.target.value);
      }
    
      function handleSubmit(e) {
        // Prevents the browser from refreshing the page on form submit
        e.preventDefault(); 
        console.log("Form submitted!");
      }
    
      return (
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="Search..." 
            onChange={handleInputChange} 
          />
          <button type="submit">Search</button>
        </form>
      );
    }
    

---
## How do I use useState to make a component interactive?

Standard variables inside a component reset every time the component re-renders. To make a component truly interactive, you need it to "remember" data between renders—like whether a menu is open, what a user typed, or a counter's current value.

In React, you do this using the **`useState`** hook. When you update a state variable, React automatically re-renders the component to show the new data on the screen.

### 1\. The `useState` Syntax

To use state, you first import it from React at the top of your file. When you call `useState`, it returns an array containing exactly two items:

1.  The **current value** of the state.
    
2.  A **function** to update that state.
    

Because it returns an array, we use JavaScript array destructuring to name these two things immediately:

    import { useState } from 'react';
    
    // Syntax: const [currentValue, updateFunction] = useState(initialValue);
    const [count, setCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [userName, setUserName] = useState("");
    

### 2\. Building an Interactive Counter

Here is how you put it all together. We will create a button that tracks how many times it has been clicked.

    import { useState } from 'react';
    
    export function Counter() {
      // 1. Initialize state with a default value of 0
      const [count, setCount] = useState(0);
    
      // 2. Create an event handler that calls the setter function
      function handleIncrement() {
        setCount(count + 1); // Tells React to update 'count' and re-render
      }
    
      return (
        <div className="counter-card">
          {/* 3. Display the current state */}
          <h2>Current Count: {count}</h2>
          
          {/* 4. Attach the event handler */}
          <button onClick={handleIncrement}>Add 1</button>
          
          {/* You can also call the setter directly inline for simple updates */}
          <button onClick={() => setCount(0)}>Reset</button>
        </div>
      );
    }
    

### 3\. The Golden Rule of State: Do Not Modify It Directly

You must **never** change a state variable directly (e.g., `count = count + 1`).

React only knows the UI needs to update when you use the provided setter function (`setCount`). If you change the variable directly, the value might update behind the scenes, but the screen will not change.

    // WRONG: React won't know about this change, and the screen won't update.
    function wrongWay() {
      count = count + 1; 
    }
    
    // CORRECT: React sees the change and re-renders the UI.
    function rightWay() {
      setCount(count + 1); 
    }
    

### 4\. Handling Text Inputs (Controlled Components)

State is incredibly useful for capturing what a user types into a form. By tying the input's `value` to a state variable, and using `onChange` to update it, React becomes the single source of truth for that input.

    import { useState } from 'react';
    
    export function NameTag() {
      const [name, setName] = useState("");
    
      return (
        <div>
          {/* The input's value is locked to our state */}
          <input 
            type="text" 
            placeholder="Type your name..."
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
          
          {/* The UI updates instantly as you type */}
          <p>Hello, my name is: <strong>{name}</strong></p>
        </div>
      );
    }
    

---
## How do I build a controlled input using React state?

A controlled input makes React's state the single source of truth. Instead of the browser's DOM remembering what the user typed, React state holds the value, and the input simply displays whatever the state tells it to.

To build one, you need three connected pieces: a state variable, a `value` prop bound to that state, and an `onChange` event to update the state when the user types.

### The Standard Implementation

    import { useState } from 'react';
    
    export default function ControlledInput() {
      // 1. The State: Holds the current value
      const [text, setText] = useState('');
    
      // 2. The Handler: Updates state on every keystroke
      const handleChange = (e) => {
        setText(e.target.value);
      };
    
      return (
        <div>
          <input
            type="text"
            value={text} // 3. The input is forced to show exactly what is in state
            onChange={handleChange} // 4. Fires every time the user types
            className="border p-2 rounded"
          />
          <p>You typed: {text}</p>
        </div>
      );
    }
    

### The "2 YOE" Approach: Handling Multiple Inputs

When a junior developer builds a form with 5 inputs, they often create 5 separate `useState` hooks and 5 separate `onChange` handlers. A more experienced approach uses a single state object and the `name` attribute to dynamically update the correct field.

    import { useState } from 'react';
    
    export default function UserForm() {
      const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: ''
      });
    
      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
          ...prev,
          [name]: value // Dynamically updates the key that matches the input's name
        }));
      };
    
      return (
        <form>
          <input name="firstName" value={formData.firstName} onChange={handleChange} />
          <input name="lastName" value={formData.lastName} onChange={handleChange} />
          <input name="email" value={formData.email} onChange={handleChange} />
        </form>
      );
    }
    

---
## How do I build and submit a form in React?

To build and submit a form in React, you attach an `onSubmit` event handler directly to the `<form>` element and use `e.preventDefault()` to stop the browser from reloading the page.

### The "0 YOE" Approach: The Button Click

Junior developers often attach an `onClick` handler directly to the submit button. This breaks native HTML accessibility features, such as hitting the "Enter" key to submit the form, and bypasses built-in HTML5 validation (like the `required` attribute).

    // ❌ Avoid this pattern
    <form>
      <input type="email" required />
      <button onClick={submitData}>Submit</button> 
    </form>
    

### The "1 YOE" Approach: Controlled Form Submission

The standard React approach uses the controlled state (from the previous step) and intercepts the native form submission.

    import { useState } from 'react';
    
    export default function StandardForm() {
      const [formData, setFormData] = useState({ email: '', password: '' });
      const [isLoading, setIsLoading] = useState(false);
    
      const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
      };
    
      const handleSubmit = async (e) => {
        e.preventDefault(); // Prevents the page reload!
        setIsLoading(true);
    
        try {
          await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          alert('Success!');
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };
    
      return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input name="email" value={formData.email} onChange={handleChange} required />
          <input name="password" type="password" value={formData.password} onChange={handleChange} required />
          
          {/* The button type="submit" triggers the form's onSubmit event */}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Log In'}
          </button>
        </form>
      );
    }
    

### The "2 YOE" Approach: Native `FormData` (Uncontrolled)

If you don't need real-time validation (like checking if passwords match _while_ the user types), experienced React developers skip `useState` entirely. By using the browser's native `FormData` API, you eliminate re-renders and drastically simplify the code.

    import { useState } from 'react';
    
    export default function OptimizedForm() {
      const [isLoading, setIsLoading] = useState(false);
    
      const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
    
        // Automatically grabs all input values based on their 'name' attributes
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries()); 
        // Result: { email: 'user@test.com', password: 'mypassword' }
    
        try {
          await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
          e.target.reset(); // Easily clear the form after submission
        }
      };
    
      return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* No value or onChange props needed! */}
          <input name="email" type="email" required />
          <input name="password" type="password" required />
          <button type="submit" disabled={isLoading}>Submit</button>
        </form>
      );
    }
    

---
## How do I validate form input and display validation errors?

To validate form input in React, you need to track both the values the user is typing and any error messages associated with those values. You can do this by using the `useState` hook for both.

Here is the standard approach for manually validating a form when the user submits it.

### 1\. Set Up State for Inputs and Errors

Create state variables for your form fields, and an `errors` state object to hold any validation messages.

JavaScript

    import { useState } from 'react';
    
    export function RegistrationForm() {
      // State for form inputs
      const [email, setEmail] = useState("");
      const [password, setPassword] = useState("");
      
      // State for validation errors
      const [errors, setErrors] = useState({});
    
      function handleSubmit(e) {
        e.preventDefault();
        
        // We will write the validation logic here
      }
    
      return (
        // JSX will go here
      );
    }
    

### 2\. Write the Validation Logic

Inside your `handleSubmit` function, check the input values against your rules. Store any errors in a temporary object, and if it has any properties, update the `errors` state to trigger a re-render.

JavaScript

      function handleSubmit(e) {
        e.preventDefault();
        
        const newErrors = {};
    
        // Validate Email
        if (!email) {
          newErrors.email = "Email is required.";
        } else if (!email.includes("@")) {
          newErrors.email = "Please enter a valid email address.";
        }
    
        // Validate Password
        if (!password) {
          newErrors.password = "Password is required.";
        } else if (password.length < 6) {
          newErrors.password = "Password must be at least 6 characters long.";
        }
    
        // Check if any errors were found
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors); // Display the errors
        } else {
          setErrors({}); // Clear errors
          console.log("Form submitted successfully!", { email, password });
          // Proceed with API call here...
        }
      }
    

### 3\. Display the Errors in JSX

In your form structure, add conditional rendering to show the error messages right below the relevant input fields.

JavaScript

      return (
        <form onSubmit={handleSubmit} className="registration-form">
          <div>
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              // Optional: Add a red border if there's an error
              style={{ borderColor: errors.email ? "red" : "initial" }}
            />
            {/* Only render the paragraph if an email error exists */}
            {errors.email && <p style={{ color: "red" }}>{errors.email}</p>}
          </div>
    
          <div>
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            {errors.password && <p style={{ color: "red" }}>{errors.password}</p>}
          </div>
    
          <button type="submit">Register</button>
        </form>
      );
    

> **Industry Standard Note:** While manual validation is great for simple forms, it gets messy as forms grow. For production applications, most React developers use a form library like **React Hook Form** paired with a validation schema library like **Zod** or **Yup** to handle validation, touch states, and performance optimization automatically.

---
## How do I render an array of objects as a list of React components?

Because JSX allows you to embed JavaScript expressions, you can render lists by using the standard JavaScript **`.map()`** array method. You map over your array of data and return a React component for each item.

### 1\. The Basic Implementation

Here is how you take an array of user objects and render a custom `<UserCard/>` component for each one.

JavaScript

    // A simple child component
    function UserCard({ name, role }) {
      return (
        <div className="card">
          <h3>{name}</h3>
          <p>{role}</p>
        </div>
      );
    }
    
    export function UserList() {
      // Your array of objects (this might come from an API)
      const teamMembers = [
        { id: 1, name: "Alice", role: "Developer" },
        { id: 2, name: "Bob", role: "Designer" },
        { id: 3, name: "Charlie", role: "Manager" }
      ];
    
      return (
        <div className="team-container">
          <h2>Meet the Team</h2>
          
          {/* Open curly braces to use JavaScript */}
          {teamMembers.map((member) => (
            <UserCard 
              key={member.id}       // <-- CRITICAL: The unique key prop
              name={member.name} 
              role={member.role} 
            />
          ))}
        </div>
      );
    }
    

### 2\. The Mandatory `key` Prop

Notice the `key={`[`member.id`](http://member.id)`}` prop attached to the `<UserCard/>` component inside the `.map()` loop. **This is required by React.**

When you render a dynamic list, React needs a way to keep track of each specific item. If an item is added, deleted, or reordered later, the `key` tells React exactly which element changed, so it only re-renders that specific piece of the DOM instead of wiping out and redrawing the entire list.

**Rules for Keys:**

-   **Must be unique among siblings:** No two items in the same list can have the same key.
    
-   **Must be stable:** The key should not change over time. (Never generate a random number like `Math.random()` for a key, because it will change on every render and destroy performance).
    
-   **Use Database IDs:** The best keys are unique IDs from your data (like [`member.id`](http://member.id)).
    
-   **Avoid using array indexes:** Using the loop index (`map((member, index) => ... key={index})`) is a bad practice if your list can be sorted, filtered, or reordered, as it will confuse React and cause UI bugs. Only use the index as a last resort for static, unchanging lists.
    

---
## Why does React need a key when rendering lists?

React uses the `key` prop to power its **reconciliation algorithm**—the process it uses to figure out exactly what changed in your data so it can update the screen as efficiently as possible.

Keys give elements a stable identity. Without them, React cannot easily tell if a specific item in a list was added, removed, or just moved to a different position.

Here is what happens under the hood that makes keys so important.

### 1\. The Performance Problem (Without Keys)

Imagine you have a list of three items, and you add a new item to the _top_ of the list:

**Old List:**

1.  Apple
    
2.  Banana
    
3.  Cherry
    

**New List:**

1.  **Mango** _(New)_
    
2.  Apple
    
3.  Banana
    
4.  Cherry
    

Without keys, React compares the lists row by row. It looks at row 1 and says, "Apple changed to Mango, I need to update this." Then it looks at row 2 and says, "Banana changed to Apple, I need to update this." It ends up mutating every single element in the list, completely redrawing them, which is terrible for performance.

**With keys**, React matches the elements by their unique IDs. It says, "Apple, Banana, and Cherry are exactly the same, they just shifted down. I will leave them alone and simply insert Mango at the top."

### 2\. The State Bug (The danger of missing/index keys)

If your list items contain their own internal state (like text inputs, checkboxes, or toggles), missing keys or using the array index as a key will cause data to leak between components.

Imagine a list of tasks, each with an `<input>` field where you typed some notes:

1.  Task A (Index 0) - _You typed: "Do this first"_
    
2.  Task B (Index 1) - _You typed: "Do this next"_
    

If you delete **Task A**, Task B shifts up and becomes Index 0.

If you used the array index as the key, React sees that the item at Index 0 still exists. It updates the title to "Task B", but it **reuses the exact same input element** from Task A. Suddenly, Task B will contain the note _"Do this first"_.

By using a unique database ID as the key (e.g., `key={`[`task.id`](http://task.id)`}`), React knows that Task A was completely destroyed, and Task B just moved up. It takes Task B's state with it, preventing the inputs from getting mixed up.

---
## How do I conditionally render different components or UI elements?

Because React components are just JavaScript functions, you handle conditional rendering using standard JavaScript operators like `if` statements, ternary operators, and the logical AND (`&&`) operator.

Here are the three most common ways to conditionally show elements in React.

### 1\. The Ternary Operator (If / Else)

When you need to choose between two different blocks of UI (like a "Log In" button versus a "Log Out" button), use the ternary operator (`condition ? true : false`) directly inside your JSX.

    export function UserProfile({ isLoggedIn }) {
      return (
        <div>
          {/* If isLoggedIn is true, render Welcome. Otherwise, render Please log in. */}
          {isLoggedIn ? (
            <h1>Welcome back!</h1>
          ) : (
            <h1>Please log in to continue.</h1>
          )}
        </div>
      );
    }
    

### 2\. Logical AND `&&` (If Only)

When you want to render something _only_ if a condition is true, and render nothing otherwise, use the logical AND operator. If the condition on the left is true, React renders the element on the right. If it is false, React ignores it.

    export function NotificationMenu({ unreadCount }) {
      return (
        <div>
          <button>Inbox</button>
          
          {/* The badge only renders if unreadCount is greater than 0 */}
          {unreadCount > 0 && (
            <span className="badge">You have {unreadCount} new messages!</span>
          )}
        </div>
      );
    }
    

**A quick warning about `&&`:** Always ensure the condition on the left evaluates to a boolean. If you write `items.length && <List/>` and the length is `0`, React will actually print the number `0` to the screen. Write `items.length > 0 && <List/>` instead.

### 3\. Early Returns (Standard If Statements)

If your entire component needs to render completely different UI based on a condition—such as a loading screen or an error state—it is often cleaner to use a standard `if` statement _before_ your main `return`.

    export function Dashboard({ isLoading, error, data }) {
      // 1. Check for loading state first
      if (isLoading) {
        return <div>Loading your dashboard...</div>;
      }
    
      // 2. Check for errors next
      if (error) {
        return <div>Sorry, something went wrong: {error.message}</div>;
      }
    
      // 3. If we pass the checks above, render the actual component
      return (
        <div>
          <h1>Dashboard</h1>
          <p>Data loaded successfully: {data.title}</p>
        </div>
      );
    }
    

---
## How do I fetch data from a Node.js API and display it in React?

To fetch data from a Node.js API (or any external API) in React, you combine the **`useState`** hook to store the data and the **`useEffect`** hook to trigger the network request as soon as the component loads.

Here is the standard pattern for fetching data, including handling the loading time and catching potential errors.

### The Complete Data Fetching Pattern

    import { useState, useEffect } from 'react';
    
    export function UserList() {
      // 1. Set up state for the data, loading status, and errors
      const [users, setUsers] = useState([]);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState(null);
    
      // 2. Use useEffect to run the fetch operation when the component mounts
      useEffect(() => {
        // Define an async function inside useEffect
        async function fetchUsers() {
          try {
            // Replace this URL with your Node.js API endpoint
            const response = await fetch('http://localhost:5000/api/users');
            
            // Check if the response is successful (status 200-299)
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            setUsers(data); // Save the data to state
          } catch (err) {
            setError(err.message); // Save the error message if it fails
          } finally {
            setIsLoading(false); // Turn off the loading state regardless of outcome
          }
        }
    
        // Call the function
        fetchUsers();
      }, []); // <-- The empty array means this only runs ONCE when the component loads
    
      // 3. Conditionally render the UI based on the current state
      if (isLoading) return <p>Loading users...</p>;
      if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    
      // 4. Render the actual data
      return (
        <div className="user-list">
          <h2>API Data</h2>
          <ul>
            {users.map(user => (
              <li key={user.id}>{user.name} - {user.email}</li>
            ))}
          </ul>
        </div>
      );
    }
    

### Why We Do It This Way

-   **The empty dependency array `[]`:** The second argument to `useEffect` is an array of dependencies. By leaving it empty `[]`, you tell React to run this effect exactly once when the component first appears on the screen. If you omit the array entirely, the fetch will run on _every single render_, causing an infinite loop that crashes your browser and overloads your server.
    
-   **Async functions in `useEffect`:** The `useEffect` hook itself cannot be made `async`. Therefore, the standard practice is to declare a standard `async` function _inside_ the hook and then call it immediately.
    
-   **The `finally` block:** Using `finally` ensures that `setIsLoading(false)` runs whether the API call succeeds or fails, guaranteeing your UI never gets stuck on a loading screen.
    

---
## How do I handle loading, success, empty, and error states for an API request?

Handling all four potential outcomes of an API request ensures your UI never breaks or leaves the user guessing.

The most efficient way to handle this is by using three state variables (`data`, `isLoading`, `error`) and using **derived state** for the empty condition. You do not need a separate `isEmpty` state variable, because you can simply check if the returned data array is empty.

### The 4-State Pattern

Here is a complete example using early returns to handle each state cleanly:

    import { useState, useEffect } from 'react';
    
    export function DataDashboard() {
      // We start with 'null' to indicate data hasn't been fetched yet, 
      // rather than an empty array which could trigger the empty state prematurely.
      const [data, setData] = useState(null);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState(null);
    
      useEffect(() => {
        async function fetchData() {
          setIsLoading(true);
          setError(null); // Reset error state on new fetches
          
          try {
            const response = await fetch('https://api.example.com/items');
            if (!response.ok) {
              throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const result = await response.json();
            setData(result);
          } catch (err) {
            setError(err.message);
          } finally {
            setIsLoading(false);
          }
        }
    
        fetchData();
      }, []);
    
      // 1. Loading State: Shown while the network request is pending
      if (isLoading) {
        return (
          <div className="loading-container">
            <span className="spinner">🔄</span>
            <p>Loading your dashboard...</p>
          </div>
        );
      }
    
      // 2. Error State: Shown if the network fails or the server returns an error
      if (error) {
        return (
          <div className="error-container">
            <h3>Oops! Something went wrong.</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        );
      }
    
      // 3. Empty State: Shown if the request succeeds, but the database is empty
      if (data && data.length === 0) {
        return (
          <div className="empty-container">
            <h3>No items found</h3>
            <p>You haven't created any items yet. Click below to get started.</p>
            <button>Create New Item</button>
          </div>
        );
      }
    
      // 4. Success State: Shown when data exists and is ready to render
      return (
        <div className="success-container">
          <h2>Your Items</h2>
          <ul>
            {data.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </div>
      );
    }
    

### Why Derive the Empty State?

React developers avoid creating duplicate or unnecessary state whenever possible. If you created a `const [isEmpty, setIsEmpty] = useState(false)` variable, you would have to manually keep it in sync with the `data` variable every time the data updates.

By simply writing `if (data.length === 0)`, React calculates the empty state on the fly during the render, guaranteeing it is always perfectly accurate and impossible to desync from the actual data.

---
## What is useEffect, and how do I use it to fetch data?

**`useEffect`** is a React Hook that lets you run "side effects" in your components. A side effect is any code that reaches outside of React's standard rendering flow to interact with the outside world—such as fetching data from a server, setting up a subscription, or manually changing the browser's DOM.

Without `useEffect`, if you put a data fetch directly inside your component, React would fetch the data, update the state, trigger a re-render, see the fetch again, fetch the data again, update the state, and create an infinite loop that crashes your app. `useEffect` prevents this by giving you control over _when_ the code runs.

### The Anatomy of useEffect

`useEffect` takes two arguments:

1.  A **setup function** containing your side-effect code.
    
2.  A **dependency array** that tells React exactly when to run that function.
    

### Code

    import { useEffect } from 'react';
    
    useEffect(() => {
      // 1. Your side effect code goes here
      
    }, []); // 2. The dependency array
    

### The Dependency Array (Crucial to understand)

The array you pass at the end controls the execution schedule of your effect.

-   **`[]` (Empty array):** The effect runs **exactly once** when the component first appears on the screen (mounts). This is what you use for initial data fetching.
    
-   **`[id, name]` (Array with variables):** The effect runs on mount, and then runs again _only_ if the values of `id` or `name` change.
    
-   **No array (Omitted entirely):** The effect runs after _every single render_. You almost never want to do this.
    

### How to use it for Data Fetching

Because the `useEffect` hook itself cannot be an `async` function, the standard pattern is to define an `async` function _inside_ the effect, and then call it immediately.

Here is the standard syntax for safely fetching data when a component loads:

    import { useState, useEffect } from 'react';
    
    export function UserProfile({ userId }) {
      const [userData, setUserData] = useState(null);
    
      useEffect(() => {
        // 1. Define the async function inside the effect
        async function fetchUser() {
          try {
            const response = await fetch(`https://api.example.com/users/${userId}`);
            const data = await response.json();
            setUserData(data);
          } catch (error) {
            console.error("Failed to fetch user:", error);
          }
        }
    
        // 2. Call the function
        fetchUser();
    
      // 3. Add userId to the dependency array. 
      // If the userId prop changes, React will re-run this effect and fetch the new user.
      }, [userId]); 
    
      if (!userData) return <p>Loading...</p>;
    
      return <h1>{userData.name}</h1>;
    }
    

---
## How does the useEffect dependency array work?

The dependency array is the control valve for your `useEffect`. It is the optional second argument that tells React exactly when it should run (or re-run) your side effect.

React determines whether to run the effect by comparing the current values in the array to the values from the previous render.

Here are the three ways you can configure the dependency array, and exactly how React interprets them.

### 1\. No Array: Runs on Every Render

If you omit the array entirely, React will run the effect after the initial render **and after every single re-render** of the component.

    useEffect(() => {
      console.log("This runs after every single render.");
      // DANGER: If you update state in here, you will create an infinite loop!
    }); 
    

### 2\. Empty Array `[]`: Runs Only Once (On Mount)

If you pass an empty array, you are telling React, "This effect does not depend on any state or props." Therefore, React runs it exactly **once** when the component first appears on the screen, and never again.

    useEffect(() => {
      console.log("This only runs once when the component mounts.");
      // Perfect for: Initial API fetches, setting up one-time event listeners.
    }, []); 
    

### 3\. Array with Variables `[x, y]`: Runs When Dependencies Change

If you put variables (state, props, or derived variables) inside the array, React will run the effect on the initial render, and then re-run it **only if one or more of those variables have changed** since the last render.

    export function ChatRoom({ roomId, currentUser }) {
      const [messages, setMessages] = useState([]);
    
      useEffect(() => {
        console.log(`Connecting to room ${roomId} as ${currentUser}...`);
        // This runs on mount.
        // It runs AGAIN if roomId changes (e.g., user clicks a different room).
        // It runs AGAIN if currentUser changes.
      }, [roomId, currentUser]); 
    

### The Golden Rule: Exhaustive Dependencies

React requires that **every reactive value** (props, state, and variables derived from them) used inside the `useEffect` must be declared in the dependency array.

If you use a variable inside the effect but leave it out of the array, your effect will run using "stale" data from an old render. Most React setups include an ESLint rule called `exhaustive-deps` that will warn you if you forget to include a dependency.

### The "Object/Function Trap" (Referential Equality)

React compares dependencies using strict equality ([`Object.is`](http://Object.is)). This works perfectly for strings, numbers, and booleans. However, it can cause major bugs with objects and arrays.

In JavaScript, two identical objects are not strictly equal if they occupy different spots in memory. Because React re-creates all standard variables on every render, passing an object or array as a dependency often tricks React into thinking the dependency has changed, causing your effect to run constantly.

    // WRONG
    const options = { url: "api/data" }; // Re-created every render
    
    useEffect(() => {
      fetch(options.url);
    }, [options]); // React thinks 'options' changes every render. Infinite loop!
    
    // CORRECT
    // Move the object INSIDE the effect if it's only used there, 
    // or extract primitive values for the dependency array.
    useEffect(() => {
      const options = { url: "api/data" };
      fetch(options.url);
    }, []);
    

---
## How do I create multiple pages in React using routes?

React itself is a Single Page Application (SPA) library—it doesn't have built-in multi-page routing. To create different URLs (like `/about` or `/contact`) that render different components, the industry standard is to use a third-party library called **React Router**.

Here is how to set up multi-page routing using the latest version of React Router (`react-router-dom` v6).

### 1\. Install React Router

Open your terminal, navigate to your project folder, and run:

    npm install react-router-dom
    

### 2\. Wrap Your App in a Router

In your main entry file (usually `main.jsx` or `index.js`), import `BrowserRouter` and wrap it around your entire `<App/>`. This gives your application the ability to read and change the browser's URL.

    // main.jsx
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import { BrowserRouter } from 'react-router-dom';
    import App from './App';
    
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    );
    

### 3\. Define Your Routes

In your `App.jsx` file, you will map specific URL paths to specific React components. You need two components from the library to do this:

-   `<Routes>`: Looks at the current URL and decides which route to render.
    
-   `<Route>`: Defines a single path and the component that belongs there.
    

### Code

    // App.jsx
    import { Routes, Route } from 'react-router-dom';
    import { Home } from './pages/Home';
    import { About } from './pages/About';
    import { Contact } from './pages/Contact';
    
    function App() {
      return (
        <div>
          {/* Anything outside of <Routes> (like a Navbar) will render on every page */}
          <nav>
            {/* Navigation links will go here in the next step */}
          </nav>
    
          {/* The Routes component swaps out the page content based on the URL */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            
            {/* The "*" path acts as a catch-all for custom 404 pages */}
            <Route path="*" element={<h1>404 - Page Not Found</h1>} />
          </Routes>
        </div>
      );
    }
    
    export default App;
    

### 4\. Link Between Pages (The Golden Rule)

To navigate between your pages, you must **never use standard HTML `<a>` tags** (e.g., `<a href="/about">`). Standard anchor tags tell the browser to request a completely new document from the server, causing a full page refresh and destroying your React state.

Instead, use React Router's `<Link>` component. It acts like an anchor tag for the user, but intercepts the click and updates the URL instantly using JavaScript, keeping the app fast and your state intact.

    import { Link } from 'react-router-dom';
    
    export function Navigation() {
      return (
        <nav className="navbar">
          <ul>
            {/* Use the 'to' prop instead of 'href' */}
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </nav>
      );
    }
    

---
## What is the difference between React Router navigation and a normal link?

The fundamental difference comes down to **how the browser loads the next page**. A normal `<a>` link asks the server for a completely new webpage, while React Router handles the navigation entirely within the browser using JavaScript.

Here is a breakdown of exactly what happens when a user clicks each type of link:

<table class="border-collapse table-auto w-full" style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><td colspan="1" rowspan="1"><p><strong>Feature</strong></p></td><td colspan="1" rowspan="1"><p><strong>Normal HTML &lt;a&gt; Tag</strong></p></td><td colspan="1" rowspan="1"><p><strong>React Router &lt;Link&gt;</strong></p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Page Refresh</strong></p></td><td colspan="1" rowspan="1"><p>Yes. The screen flashes white as the browser unloads the current page and draws a new one.</p></td><td colspan="1" rowspan="1"><p>No. The transition is instant. React just swaps out the components on the screen.</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Application State</strong></p></td><td colspan="1" rowspan="1"><p><strong>Destroyed.</strong> All React state (e.g., form inputs, toggled menus, user data) is wiped out and reset.</p></td><td colspan="1" rowspan="1"><p><strong>Preserved.</strong> Because the page never actually reloads, your state variables remain completely intact.</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Network Request</strong></p></td><td colspan="1" rowspan="1"><p>Downloads the entire HTML, CSS, and JavaScript for the app all over again.</p></td><td colspan="1" rowspan="1"><p>Only downloads new data if your components explicitly request it via an API call.</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Speed</strong></p></td><td colspan="1" rowspan="1"><p>Slower, because the browser has to parse and render a brand new document from scratch.</p></td><td colspan="1" rowspan="1"><p>Blazing fast, feeling more like a native mobile app.</p></td></tr></tbody></table>

### Why they still look the same to the user

Even though React Router's `<Link>` stops the page from reloading, it still renders as a standard `<a>` tag in the final HTML that the browser sees.

This is done on purpose so that users can still right-click to "Open in New Tab," search engine bots can still follow the links to index your site, and screen readers can still announce them correctly to visually impaired users. React simply attaches an invisible event listener to that tag that says, _"When clicked, update the URL in the address bar, but stop the browser from actually refreshing."_

---
## How do I create a dynamic route such as /products/:id?

Here is the quick 3-step cheat sheet for setting up and using a dynamic route.

**1\. The Route Setup**

Add a colon (`:`) before the variable name in your `App.jsx` routing setup. This tells React Router that the value is dynamic.

JavaScript

    import { Routes, Route } from 'react-router-dom';
    import { ProductDetails } from './ProductDetails';
    
    function App() {
      return (
        <Routes>
          {/* Matches /products/1, /products/abc, etc. */}
          <Route path="/products/:id" element={<ProductDetails />} /> 
        </Routes>
      );
    }
    

**2\. The Link (Sending the ID)**

When sending users to the page, use template literals to insert the specific ID into the URL string.

JavaScript

    import { Link } from 'react-router-dom';
    
    export function ProductCard({ product }) {
      return (
        <div>
          <h3>{product.name}</h3>
          {/* If product.id is 99, this links to /products/99 */}
          <Link to={`/products/${product.id}`}>View Details</Link>
        </div>
      );
    }
    

**3\. The Component (Reading the ID)**

Inside the component that gets rendered, use the `useParams` hook to read the ID from the URL so you can fetch the correct data.

JavaScript

    import { useParams } from 'react-router-dom';
    import { useEffect, useState } from 'react';
    
    export function ProductDetails() {
      // The destructured variable name MUST match the one in your Route path
      const { id } = useParams(); 
      const [product, setProduct] = useState(null);
    
      useEffect(() => {
        // Fetch data using the ID from the URL
        fetch(`https://api.example.com/products/${id}`)
          .then(res => res.json())
          .then(data => setProduct(data));
      }, [id]);
    
      if (!product) return <p>Loading...</p>;
    
      return <h1>{product.name} (ID: {id})</h1>;
    }
    

---
## Why does a React frontend on port 3000 get CORS errors when calling a Node backend on port 4444, and how does the Vite proxy solve it?

You get a CORS error because browsers enforce the **Same-Origin Policy**, which blocks frontend code from requesting data from a different domain or port (port 3000 vs 4444 are considered different origins).

The **Vite proxy** solves this by acting as a middleman. You configure your React app to send API requests to itself (port 3000). Because the port matches, the browser allows it. Behind the scenes, the Vite development server catches those requests and forwards them directly to your Node backend (port 4444), completely bypassing the browser's security block.

### The Quick Fix

**1\. Update `vite.config.js`**

Add the `server.proxy` block to forward any request starting with `/api` to your backend:

    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    
    export default defineConfig({
      plugins: [react()],
      server: {
        proxy: {
          '/api': {
            target: 'http://localhost:4444',
            changeOrigin: true,
          },
        },
      },
    })
    

**2\. Update your fetch calls**

Remove the hardcoded [`http://localhost:4444`](http://localhost:4444) from your React components. Use relative paths instead:

    // WRONG: Triggers CORS
    fetch('http://localhost:4444/api/users')
    
    // CORRECT: Uses the proxy (bypasses CORS)
    fetch('/api/users')
    

---
## How do I organize API calls into a separate service layer instead of putting fetch() inside every component?

Writing `fetch()` or `axios` calls directly inside your React components makes them bloated, hard to test, and difficult to maintain. If your backend URL changes, or if you need to add an authentication token to every request, you would have to update dozens of files manually.

Extracting your API calls into a separate **Service Layer** solves this. A service layer is simply a dedicated folder/file that handles all network requests, acting as a bridge between your React UI and your backend.

Here is how to set it up step-by-step.

### 1\. Create the API Service File

Create a new folder in your `src` directory called `services` (or `api`), and create a file for your specific resource, like `userService.js`.

In this file, define your base URL and export standard JavaScript functions for each API action.

JavaScript

    // src/services/userService.js
    
    const BASE_URL = 'https://api.example.com/users';
    
    // Helper function to handle standard errors
    async function handleResponse(response) {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Network response was not ok');
      }
      return response.json();
    }
    
    // Export individual functions for your components to use
    export const userService = {
      
      // GET all users
      async getAll() {
        const response = await fetch(BASE_URL);
        return handleResponse(response);
      },
    
      // GET a single user
      async getById(id) {
        const response = await fetch(`${BASE_URL}/${id}`);
        return handleResponse(response);
      },
    
      // POST a new user
      async create(userData) {
        const response = await fetch(BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });
        return handleResponse(response);
      }
    };
    

### 2\. Use the Service in Your Component

Now, inside your React component, you simply import the service. The component no longer cares _how_ the data is fetched (headers, URLs, JSON parsing); it only cares about calling the function and updating the UI.

JavaScript

    // src/components/UserList.jsx
    import { useState, useEffect } from 'react';
    import { userService } from '../services/userService';
    
    export function UserList() {
      const [users, setUsers] = useState([]);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState(null);
    
      useEffect(() => {
        async function loadUsers() {
          try {
            // Look how clean this is!
            const data = await userService.getAll();
            setUsers(data);
          } catch (err) {
            setError(err.message);
          } finally {
            setIsLoading(false);
          }
        }
    
        loadUsers();
      }, []);
    
      if (isLoading) return <p>Loading users...</p>;
      if (error) return <p>Error: {error}</p>;
    
      return (
        <ul>
          {users.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      );
    }
    

### Why this is the Industry Standard

1.  **Reusability:** If three different components need to fetch the user list, they all import `userService.getAll()`.
    
2.  **Centralized Error Handling:** If your API starts returning `401 Unauthorized`, you can handle the redirect to the login screen inside your `handleResponse` helper function, rather than rewriting that logic in every component.
    
3.  **Easy Swapping:** If you decide to switch from `fetch()` to `axios` tomorrow, you only update the `userService.js` file. Your React components don't change at all.
    

---
## How do I share state between components without passing props through multiple levels?

When you pass data from a top-level component down to a deeply nested child component by passing it through every single component in between, it is called **prop drilling**.

Prop drilling makes your code messy because intermediate components are forced to accept and pass along props they don't even use.

To solve this, React provides a built-in feature called the **Context API**. It allows you to "teleport" data directly to the components that need it, completely bypassing the middle layers.

### How to use the Context API

Here is a step-by-step example of sharing a user's theme preference (light or dark mode) across an app without prop drilling.

**1\. Create the Context** First, create a context and export it.

JavaScript

    // ThemeContext.jsx
    import { createContext } from 'react';
    
    // Create a context with a default value (optional)
    export const ThemeContext = createContext('light');
    

**2\. Provide the Context** Wrap the parent component (usually your main `App`) in the Context's `.Provider` component. Any value you pass to the `value` prop will be available to _all_ components inside it, no matter how deeply nested they are.

JavaScript

    // App.jsx
    import { useState } from 'react';
    import { ThemeContext } from './ThemeContext';
    import { Layout } from './Layout';
    
    export function App() {
      const [theme, setTheme] = useState('dark');
    
      return (
        // Everything inside this Provider can access the 'theme' value
        <ThemeContext.Provider value={theme}>
          <Layout />
        </ThemeContext.Provider>
      );
    }
    

**3\. Consume the Context** In any child component that needs the data, import the `useContext` hook and the context you created. You don't need to pass anything through the intermediate `<Layout>` component!

JavaScript

    // DeeplyNestedButton.jsx
    import { useContext } from 'react';
    import { ThemeContext } from './ThemeContext';
    
    export function DeeplyNestedButton() {
      // Directly grab the value from the provider
      const currentTheme = useContext(ThemeContext);
    
      return (
        <button className={`btn-${currentTheme}`}>
          Current Theme is {currentTheme}
        </button>
      );
    }
    

### When to use External State Libraries

While the Context API is great for data that doesn't change very often (like themes, user authentication status, or preferred language), it is not optimized for high-frequency state changes. Every time a Context value changes, _every_ component consuming that context will re-render.

If you are building a complex application with rapidly changing, highly interconnected state (like a real-time dashboard or a complex shopping cart), the industry standard is to use external state management libraries like:

-   **Zustand:** Currently the most popular choice for modern React. It is incredibly lightweight and easy to set up.
    
-   **Redux Toolkit:** The heavyweight champion for massive enterprise applications.
    
-   **Recoil or Jotai:** Excellent for apps that need highly granular, atom-based state updates.
    

---
## How do I use Context API for authentication, theme, or cart state?

Authentication, Themes, and Shopping Carts are the holy trinity of the Context API. They are the perfect use cases because they represent "global" data that components all over your application need to read and update.

The industry standard for handling any of these is the **Custom Hook Pattern**. Instead of making every component import `useContext` and your Context object, you create a custom hook (like `useAuth` or `useCart`) that hides the messy plumbing.

Here is exactly how to build an Authentication context using this professional pattern.

### 1\. The Provider & The Hook (All in one file)

Create a single file to hold both your Provider component and your custom hook. This keeps all your authentication logic centralized.

    // src/context/AuthContext.jsx
    import { createContext, useContext, useState } from 'react';
    
    // 1. Create the Context
    const AuthContext = createContext(null);
    
    // 2. Create the Provider Component
    export function AuthProvider({ children }) {
      const [user, setUser] = useState(null); // null means not logged in
    
      function login(userData) {
        // In a real app, you would make an API call here first
        setUser(userData);
      }
    
      function logout() {
        setUser(null);
      }
    
      // Pass the state and the actions down
      return (
        <AuthContext.Provider value={{ user, login, logout }}>
          {children}
        </AuthContext.Provider>
      );
    }
    
    // 3. Create and export the Custom Hook (The Secret Weapon)
    export function useAuth() {
      const context = useContext(AuthContext);
      // Optional safety check: throw an error if a developer tries to 
      // use this hook outside of the AuthProvider
      if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
      }
      return context;
    }
    

### 2\. Wrap the Application

Just like with the Theme example, wrap your app (or the part of it that needs authentication) in your new provider.

    // main.jsx
    import { AuthProvider } from './context/AuthContext';
    import App from './App';
    
    <AuthProvider>
      <App />
    </AuthProvider>
    

### 3\. Consume it Cleanly Anywhere

Now, whenever any component needs to know who is logged in, or needs to log someone out, it only needs a single line of code. It doesn't need to know that Context API even exists behind the scenes.

    // src/components/Navbar.jsx
    import { useAuth } from '../context/AuthContext';
    
    export function Navbar() {
      // Grab exactly what you need from your custom hook
      const { user, login, logout } = useAuth();
    
      return (
        <nav>
          <h2>My App</h2>
          
          {user ? (
            <div>
              <span>Welcome, {user.name}!</span>
              <button onClick={logout}>Log Out</button>
            </div>
          ) : (
            <button onClick={() => login({ name: 'Jane Doe', id: 1 })}>
              Log In
            </button>
          )}
        </nav>
      );
    }
    

### How this scales to Theme and Cart

You can duplicate this exact file structure for `ThemeContext.jsx` and `CartContext.jsx`. The only thing that changes is the state and the functions inside the Provider:

-   **Theme (`useTheme`):** State is a string (`'light'`). Functions are `toggleTheme()` or `setDarkMode()`.
    
-   **Auth (`useAuth`):** State is a user object (`{ id, name, email }`). Functions are `login()`, `logout()`, `register()`.
    
-   **Cart (`useCart`):** State is an array of objects (`[{ id, price, qty }]`). Functions are `addToCart()`, `removeFromCart()`, `clearCart()`.
    

> **Performance Note on Carts:** If you are building a massive e-commerce site where the cart updates constantly and you have hundreds of components, Context can cause unnecessary re-renders. In that specific scenario, developers usually graduate to a dedicated state library like **Zustand** or **Redux**. But for standard apps, Context is perfect.

---
## Login, Logout, and Protected Routes in React

In a React application you can manage authentication state with the Context API and protect routes using `react-router-dom`. The following steps show a typical implementation:

### 1\. Create an authentication context

    import React, { createContext, useState, useContext } from 'react';
    import { useNavigate } from 'react-router-dom';
    
    // Create the context
    const AuthContext = createContext(null);
    
    // Provider component
    export function AuthProvider({ children }) {
      const [user, setUser] = useState(null);
      const navigate = useNavigate();
    
      const login = async (username, password) => {
        // Replace this with a real API call
        const fakeUser = { id: 1, name: username };
        setUser(fakeUser);
        navigate('/dashboard');
      };
    
      const logout = () => {
        setUser(null);
        navigate('/login');
      };
    
      const value = { user, login, logout, isAuthenticated: !!user };
      return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
    }
    
    // Hook for easy access
    export function useAuth() {
      return useContext(AuthContext);
    }
    

### 2\. Wrap your app with the provider

    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import { BrowserRouter } from 'react-router-dom';
    import App from './App';
    import { AuthProvider } from './auth';
    
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </React.StrictMode>
    );
    

### 3\. Build a `Login` component

    import React, { useState } from 'react';
    import { useAuth } from '../auth';
    
    export default function Login() {
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const { login } = useAuth();
    
      const handleSubmit = (e) => {
        e.preventDefault();
        login(username, password);
      };
    
      return (
        <form onSubmit={handleSubmit}>
          <div>
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">Login</button>
        </form>
      );
    }
    

### 4\. Add a logout button

    import React from 'react';
    import { useAuth } from '../auth';
    
    export default function LogoutButton() {
      const { logout } = useAuth();
    
      return (
        <button onClick={logout}>Logout</button>
      );
    }
    

### 5\. Create a `ProtectedRoute` component (React Router v6)

    import React from 'react';
    import { Navigate, Outlet } from 'react-router-dom';
    import { useAuth } from '../auth';
    
    export default function ProtectedRoute() {
      const { isAuthenticated } = useAuth();
    
      // If not authenticated, redirect to login
      return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
    }
    

### 6\. Define routes in `App.js`

    import React from 'react';
    import { Routes, Route } from 'react-router-dom';
    import Login from './pages/Login';
    import Dashboard from './pages/Dashboard';
    import ProtectedRoute from './components/ProtectedRoute';
    import LogoutButton from './components/LogoutButton';
    
    function App() {
      return (
        <Routes>
          <Route path="/login" element=<Login /> />
    
          <Route element=<ProtectedRoute />>
            <Route path="/dashboard" element={
              <div>
                <h2>Dashboard</h2>
                <LogoutButton />
              </div>
            } />
          </Route>
    
          <Route path="*" element=<Navigate to="/login" replace /> />
        </Routes>
      );
    }
    
    export default App;
    

### 7\. Summary of the flow

-   The `AuthProvider` stores the current user and provides `login` and `logout` functions.
    
-   The `Login` component calls `login`, which updates the context and redirects to a protected page.
    
-   The `ProtectedRoute` checks `isAuthenticated`. If false, it redirects to `/login`; otherwise it renders the nested route via `Outlet`.
    
-   The `LogoutButton` clears the user state and redirects back to the login screen.
    

By centralising authentication logic in a context and using a wrapper route component, you keep your UI components clean and ensure that only authenticated users can access protected parts of the app.

---
## Why does a React component re‑render?

React decides to render a component again whenever it thinks the output might change. The most common triggers are:

-   **State changes** – calling `setState` or a state updater from `useState`.
    
-   **Prop changes** – a parent renders with new values for the component’s props.
    
-   **Context changes** – a value from `React.createContext` updates.
    
-   **Parent re‑render** – even if props stay the same, the child will re‑render unless it’s memoized.
    
-   **Hook changes** – e.g., a new function reference from `useCallback` or a new object from `useMemo` that isn’t stable.
    
-   **Force update** – calling `forceUpdate` (class components) or mutating a ref that triggers a state change.
    

React’s _reconciliation_ algorithm then determines whether the DOM actually needs to be updated, but the component function or class body runs every time any of the above happen.

### Code example – typical re‑render triggers

    import React, { useState, useEffect, useContext, memo } from 'react';
    import { ThemeContext } from './theme-context';
    
    function Counter({ step }) {
      const [count, setCount] = useState(0);          // 1️⃣ state change → re‑render
      const theme = useContext(ThemeContext);        // 2️⃣ context change → re‑render
    
      useEffect(() => {
        console.log('Counter rendered', { count, step, theme });
      });
    
      return (
        <div style={{ color: theme.textColor }}>
          <p>Count: {count}</p>
          <button onClick={() => setCount(c => c + step)}>Add {step}</button>
        </div>
      );
    }
    
    // Memoizing prevents re‑render when props stay the same
    export default memo(Counter);
    

## How can you find out what caused a specific re‑render?

There are three practical approaches you can use directly in the browser.

### 1\. React DevTools Profiler

-   Open the **Profiler** tab.
    
-   Record a session, interact with your UI, then stop recording.
    
-   Click a component in the flamegraph to see:
    
    -   Why it rendered (`props changed`, `state changed`, `context changed`).
        
    -   The exact values before and after the change.
        

### 2\. Log the reasons manually

Use a custom hook that compares previous values with the current ones and logs differences.

    import { useRef, useEffect } from 'react';
    
    function useWhyDidYouRender(name, { props, state }) {
      const prev = useRef({ props, state });
    
      useEffect(() => {
        const changed = [];
    
        // compare props
        for (const key in props) {
          if (props[key] !== prev.current.props[key]) {
            changed.push(`prop "${key}"`);
          }
        }
    
        // compare state (if you pass a plain object)
        for (const key in state) {
          if (state[key] !== prev.current.state[key]) {
            changed.push(`state "${key}"`);
          }
        }
    
        if (changed.length) {
          console.log(`[${name}] re‑rendered because: ${changed.join(', ')}`);
        }
    
        prev.current = { props, state };
      });
    }
    

Usage inside a component:

    function Counter({ step }) {
      const [count, setCount] = useState(0);
    
      useWhyDidYouRender('Counter', { props: { step }, state: { count } });
    
      return (
        <button onClick={() => setCount(c => c + step)}>{count}</button>
      );
    }
    

### 3\. Third‑party library – `why-did-you-render`

Install the package and enable it for your components. It prints a detailed message in the console whenever a component re‑renders unnecessarily.

    // npm install @welldone-software/why-did-you-render
    import React from 'react';
    import whyDidYouRender from '@welldone-software/why-did-you-render';
    
    whyDidYouRender(React, {
      trackAllPureComponents: true,
    });
    
    // In a component file
    function Counter({ step }) {
      // component body …
    }
    Counter.whyDidYouRender = true; // enable tracking for this component
    

### Putting it together – diagnosing a re‑render

    import React, { useState, memo } from 'react';
    import { useWhyDidYouRender } from './useWhyDidYouRender';
    
    function Parent() {
      const [toggle, setToggle] = useState(false);
      return (
        <>
          <button onClick={() => setToggle(t => !t)}>Toggle</button>
          <Child step={1} />   {/* step never changes */}
        </>
      );
    }
    
    const Child = memo(function Child({ step }) {
      const [count, setCount] = useState(0);
      useWhyDidYouRender('Child', { props: { step }, state: { count } });
    
      return (
        <button onClick={() => setCount(c => c + step)}>{count}</button>
      );
    });
    
    export default Parent;
    

When you click _Toggle_ in `Parent`, the console will show:

    [Child] re‑rendered because:  // no output – memo prevented a re‑render
    

When you click the `Child` button, you’ll see:

    [Child] re‑rendered because: state "count"
    

This combination of DevTools, manual logging, or `why-did-you-render` lets you pinpoint exactly why a component rendered and helps you optimise unnecessary updates.

---
## When to Use `React.memo`, `useMemo`, and `useCallback`

React provides three memoization utilities that help you avoid unnecessary work and re‑renders. Each solves a distinct problem, so picking the right one depends on what you need to memoize.

### 1\. `React.memo` – Memoizing a Component

Wrap a pure functional component with `React.memo` when its rendered output depends only on its props. React shallow‑compares the previous and next props; if they are equal, the component is skipped.

-   **When to use:** The component is relatively expensive to render (large lists, complex calculations) and it receives props that stay the same across most renders.
    
-   **When not to use:** The component is cheap to render or receives frequently‑changing objects/functions created inline.
    

Code

    import React from 'react';
    
    function heavyComputation(num) {
      let sum = 0;
      for (let i = 0; i < 1e6; i++) {
        sum += Math.sqrt(num + i);
      }
      return sum.toFixed(2);
    }
    
    const ExpensiveItem = React.memo(function ExpensiveItem({ value }) {
      // Heavy calculation runs only when `value` changes
      const result = heavyComputation(value);
      return <div>Result: {result}</div>;
    });
    
    export default function Parent({ count }) {
      return (
        <div>
          {/* This component will not re‑render unless `count` changes */}
          <ExpensiveItem value={count} />
        </div>
      );
    }
    

### 2\. `useMemo` – Memoizing a Value

Use `useMemo` when you need to cache the result of a computation so that the expensive function runs only when its dependencies change. It returns the memoized value, not a function.

-   **When to use:** You have a computationally heavy derived value that would be recomputed on every render.
    
-   **When not to use:** The calculation is cheap; the overhead of memoization could outweigh the benefit.
    

Code

    import React, { useState, useMemo } from 'react';
    
    function FilteredList({ items, filter }) {
      const filtered = useMemo(() => {
        console.log('Filtering…');
        return items.filter(item =>
          item.toLowerCase().includes(filter.toLowerCase())
        );
      }, [items, filter]); // recompute only when `items` or `filter` change
    
      return (
        <ul>
          {filtered.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      );
    }
    
    export default function App() {
      const [filter, setFilter] = useState('');
      const items = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];
    
      return (
        <div>
          <input
            placeholder="Filter"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <FilteredList items={items} filter={filter} />
        </div>
      );
    }
    

### 3\. `useCallback` – Memoizing a Function

`useCallback` returns a stable function reference that only changes when its dependencies change. This is useful when you need to pass callbacks to memoized children or when a function is a dependency of `useEffect` / `useMemo`.

-   **When to use:** Passing a callback to a `React.memo` child, or keeping a callback stable for effect dependencies.
    
-   **When not to use:** The function is cheap and never passed to memoized children; adding `useCallback` only adds indirection.
    

Code

    import React, { useState, useCallback, useEffect } from 'react';
    
    const Button = React.memo(function Button({ onClick, label }) {
      console.log('Button render:', label);
      return <button onClick={onClick}>{label}</button>;
    });
    
    export default function Counter() {
      const [count, setCount] = useState(0);
    
      // Stable reference – does not change on every render
      const increment = useCallback(() => setCount(c => c + 1), []);
    
      // Example: using the same callback as a dependency of an effect
      useEffect(() => {
        console.log('Effect runs because `increment` reference is stable');
      }, [increment]);
    
      return (
        <div>
          <p>Count: {count}</p>
          <Button onClick={increment} label="Increment" />
        </div>
      );
    }
    

### 4\. Quick Reference Cheat Sheet

<table class="border-collapse table-auto w-full" style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Utility</p></th><th colspan="1" rowspan="1"><p>What it memoizes</p></th><th colspan="1" rowspan="1"><p>Typical use case</p></th></tr><tr><td colspan="1" rowspan="1"><p><code>React.memo</code></p></td><td colspan="1" rowspan="1"><p>Entire functional component</p></td><td colspan="1" rowspan="1"><p>Skip re‑rendering a pure component when its props haven’t changed.</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>useMemo</code></p></td><td colspan="1" rowspan="1"><p>Value (result of a computation)</p></td><td colspan="1" rowspan="1"><p>Cache expensive derived data between renders.</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>useCallback</code></p></td><td colspan="1" rowspan="1"><p>Function reference</p></td><td colspan="1" rowspan="1"><p>Provide stable callbacks to memoized children or effect dependencies.</p></td></tr></tbody></table>

Memoization is an optimization tool, not a default. Profile your app first; premature use can add memory overhead and make the code harder to read.