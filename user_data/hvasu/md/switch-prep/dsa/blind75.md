## Longest Consecutive Sequence (LeetCode 128)

**Core Challenge:** Find the longest consecutive sequence in an unsorted array in **O(n)** time. Sorting the array takes O(n log n), so that approach is disqualified.

### Algorithm Approach (The "HashSet" Method)

The trick to achieving O(n) is minimizing redundant checks. You only want to count a sequence starting from its **very first number**.

1.  **Populate a HashSet:** Insert every number from the array into a HashSet. This removes duplicates and allows for O(1) constant time lookups.
    
2.  **Find the Starts of Sequences:** Iterate through the numbers in the Set. For each number, check if it is the _start_ of a sequence. A number `x` is the start of a sequence ONLY if `x - 1` does NOT exist in the Set.
    
3.  **Count Upwards:** If you find a starting number, use a loop to check if `x + 1`, `x + 2`, `x + 3`, etc., exist in the Set.
    
4.  **Track the Maximum:** Keep a running tally of the current sequence's length and update your global maximum length whenever a sequence finishes.
    

_Why is this O(n)?_ Even though there is a loop inside a loop, the inner loop only ever triggers when you are at the absolute start of a sequence. Each number in the array is visited at most twice (once to check if it's a start, once while counting a sequence).

### Crucial Java Syntax to Remember

To write this cleanly in Java, you need these specific methods and structures:

-   **Initializing the HashSet:** `Set<Integer> numSet = new HashSet<>();`
    
-   **Populating the Set (Enhanced For-Loop):** `for (int num : nums) { numSet.add(num); }`
    
-   **Checking for the "Start" of a sequence (O(1) lookup):** `!numSet.contains(num - 1)`
    
-   **Checking the next consecutive number:** `numSet.contains(currentNum + 1)`
    
-   **Updating your maximum length:** `longest = Math.max(longest, currentStreak);`
    

---
## Two Sum (LeetCode 1)

The core challenge is finding a pair of numbers that add up to a specific target in $O(n)$ time. The brute force approach (nested loops) takes $O(n^2)$, so we use a **HashMap** to remember numbers we've seen and achieve $O(1)$ lookups.

### Algorithm Approach (The "One-Pass HashMap" Method)

1.  **Initialize a HashMap:** This map will store the numbers we visit as the _keys_, and their array indices as the _values_.
    
2.  **Iterate Through the Array:** Loop through the array exactly once.
    
3.  **Calculate the Complement:** For every number at index `i`, calculate its complement: `target - nums[i]`. This is the exact number you need to find to solve the problem.
    
4.  **Check the HashMap:** Look inside your map to see if you have already encountered this complement.
    
    -   If **yes**, you are done! Return the index of the complement (retrieved from the map) and your current index `i`.
        
    -   If **no**, add the current number and its index `i` into the map so it can be checked by future numbers.
        

> **Why this is $O(n)$:** You traverse the array exactly once. For each element, calculating the complement and checking/inserting into the HashMap takes $O(1)$ average time.

### Key Java Syntax to Remember

To write this cleanly, keep these specific HashMap methods in mind:

-   **Initializing the Map (Value -> Index):**
    
    `Map<Integer, Integer> map = new HashMap<>();`
    
-   **Calculating the Complement:**
    
    `int complement = target - nums[i];`
    
-   **Checking if the Complement Exists:**
    
    `map.containsKey(complement)`
    
-   **Getting the Index of the Complement:**
    
    `map.get(complement)`
    
-   **Adding the Current Number and Index to the Map:**
    
    `map.put(nums[i], i);`
    
-   **Returning an Inline Integer Array:**
    
    `return new int[] { map.get(complement), i };`
    

---
## Longest Substring Without Repeating Characters (LeetCode 3)

The core challenge is finding the longest contiguous block of unique characters in a string in $O(n)$ time. A brute force approach of checking every possible substring takes $O(n^3)$ or $O(n^2)$, so we use the **Sliding Window** technique combined with a **HashSet**.

### Algorithm Approach (The "Sliding Window" Method)

1.  **Initialize Pointers and a Set:** Create a `HashSet` to keep track of the characters currently in your valid substring. Use two pointers, `left` and `right`, both starting at the beginning of the string (index 0).
    
2.  **Expand the Window:** Move the `right` pointer one character at a time to expand your window.
    
3.  **Handle Duplicates (Shrink Window):** Before adding the character at the `right` pointer to your set, check if it already exists.
    
    -   If it **does exist**, you have found a repeat. You must shrink your window from the left. Use a `while` loop to remove the character at the `left` pointer from the set and increment `left`. Keep doing this until the duplicate character is completely out of the window.
4.  **Add and Update Maximum:** Once the window is valid (no duplicates), add the `right` character to the set. Calculate the current window size (`right - left + 1`) and update your global maximum length if this is the longest sequence you've seen so far.
    

> **Why this is $O(n)$:** The `right` pointer moves through the string exactly once. In the worst case, the `left` pointer also moves through the string exactly once. Each character is processed at most twice, resulting in a linear time complexity.

### Key Java Syntax to Remember

To write this cleanly without getting tripped up by Java's String methods, remember these specific operations:

-   **Getting a Character from a String:**
    
    `char c = s.charAt(right);`
    
-   **Initializing the Set (for Characters):**
    
    `Set<Character> charSet = new HashSet<>();`
    
-   **Checking for Duplicates in the Window:**
    
    `charSet.contains(s.charAt(right))`
    
-   **Removing the Leftmost Character (Shrinking):**
    
    `charSet.remove(s.charAt(left));`
    
-   **Updating the Maximum Length:**
    
    `maxLength = Math.max(maxLength, right - left + 1);` _(Alternatively, you can just use `charSet.size()` if you add the new character before calculating the max)._
    

---
## Longest Palindromic Substring (LeetCode 5)

The core challenge is finding the longest palindrome efficiently. A brute-force approach (checking every possible substring) takes $O(n^3)$ time. We can optimize this to $O(n^2)$ time and $O(1)$ space using the **Expand Around Center** technique.

_(Note: Dynamic Programming is another $O(n^2)$ approach, but it requires $O(n^2)$ extra memory, making the center-expansion method the preferred interview answer)._

### Algorithm Approach (The "Expand Around Center" Method)

1.  **Iterate Through Every Character:** Loop through the string. Treat every single character as the exact middle of a potential palindrome.
    
2.  **Expand Outwards:** Create a helper method that starts at the center and expands a `left` and `right` pointer outwards one step at a time. It keeps expanding as long as the characters at both pointers match and are within the string's boundaries.
    
3.  **Handle Odd vs. Even Lengths:** Palindromes can have a single center character (e.g., "a**b**a" - odd length) or a double center character (e.g., "a**bb**a" - even length). For every index `i`, you must run your expansion method twice:
    
    -   Once with the center at `i` and `i` (for odd palindromes).
        
    -   Once with the center at `i` and `i + 1` (for even palindromes).
        
4.  **Track the Boundaries:** Take the maximum length found from both expansions. If this new length is longer than your previous record, mathematically calculate the new `start` and `end` indices of this palindrome and store them.
    
5.  **Return the Substring:** Once the loop finishes, use your tracked `start` and `end` indices to slice the final answer from the original string.
    

> **Why this is $O(n^2)$:** You loop through the string once $O(n)$. For each character, the expansion could theoretically go through the whole string in the worst case (like "aaaaa"), which is another $O(n)$ operation. $n \\times n = O(n^2)$.

### Key Java Syntax to Remember

To write this cleanly, you need a helper method and some specific math to update your substring boundaries:

-   **Calling the expansions (inside your main loop):**
    
    `int len1 = expandAroundCenter(s, i, i);` (Odd)
    
    `int len2 = expandAroundCenter(s, i, i + 1);` (Even)
    
-   **The Helper Method's `while` loop condition:**
    
    `while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right))`
    
-   **The trickiest part: Updating `start` and `end` using the center `i` and max `length`:**
    
    `start = i - (len - 1) / 2;`
    
    `end = i + len / 2;`
    
-   **Returning the final string:**
    
    `return s.substring(start, end + 1);` _(Remember: Java's `substring` method is inclusive of the starting index, but exclusive of the ending index!)_
    

---
## Container With Most Water (LeetCode 11)

The core challenge is finding the maximum area of water that can be contained between two lines in $O(n)$ time. A brute-force approach (checking every possible pair of lines) takes $O(n^2)$ time. We can optimize this to $O(n)$ time and $O(1)$ space using the **Two Pointers** technique.

### Algorithm Approach (The "Greedy Two Pointers" Method)

1.  **Initialize Pointers:** Place one pointer at the absolute beginning of the array (`left`) and one at the absolute end (`right`). This gives you the maximum possible width.
    
2.  **Calculate Area:** The area of water is determined by the `width` (distance between pointers) multiplied by the `height`. Because water spills over the shorter side, the height is always restricted by the **shorter line**.
    
3.  **Update Maximum:** Compare the area you just calculated with your global maximum area and update it if the new one is larger.
    
4.  **Move the Pointers (The Greedy Choice):** To find a potentially larger area, you must move a pointer inward. Since the height is limited by the shorter line, moving the taller line inward cannot possibly increase the area (the width shrinks, and the height is still bottlenecked by the short line). Therefore, **always move the pointer that points to the shorter line**.
    
5.  **Repeat:** Continue calculating and moving pointers until the `left` and `right` pointers meet.
    

> **Why this is $O(n)$:** The two pointers start at opposite ends and move strictly inward. They evaluate each line in the array at most once until they meet in the middle, guaranteeing linear time complexity.

### Key Java Syntax to Remember

To write this efficiently in an interview, keep these specific loop conditions and math operations in mind:

-   **Initializing the Pointers:**
    
    `int left = 0, right = height.length - 1;`
    
-   **The Loop Condition (Stop when they meet):**
    
    `while (left < right)`
    
-   **Calculating the Area:**
    
    `int currentArea = Math.min(height[left], height[right]) * (right - left);`
    
-   **Updating the Maximum Area:**
    
    `maxArea = Math.max(maxArea, currentArea);`
    
-   **The Pointer Movement Logic:**
    
    Java
    
        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    

---