# Blind 75 LeetCode Solutions in Java

A comprehensive guide to the **Blind 75** LeetCode problems, categorized by pattern and topic. Each problem includes:

-   Problem description and LeetCode link
-   Core algorithm & intuition
-   Time and Space complexity analysis
-   Complete, optimal solution implemented in **Java**

---

---
# Array

## 1\. Two Sum

-   **LeetCode**: [1\. Two Sum](https://leetcode.com/problems/two-sum/)
-   **Difficulty**: Easy
-   **Pattern**: Hash Map

### Algorithm

1.  Use a hash map to store each number and its index as we iterate through the array.
2.  For each element `nums[i]`, compute its complement: `target - nums[i]`.
3.  If the complement already exists in the map, return the complement's index and current index `i`.
4.  Otherwise, put `(nums[i], i)` into the hash map.
5.  This allows finding the pair in a single pass.

### Complexity

-   **Time Complexity**: $O(n)$ — Single traversal of the array; map lookups are $O(1)$ on average.
-   **Space Complexity**: $O(n)$ — Storing up to $n$ elements in the hash map.

### Java Solution

```java
import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}
```

---
## 2\. Best Time to Buy and Sell Stock

-   **LeetCode**: [121\. Best Time to Buy and Sell Stock](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/)
-   **Difficulty**: Easy
-   **Pattern**: Sliding Window / One Pass

### Algorithm

1.  Maintain `minPrice` initialized to `Integer.MAX_VALUE` and `maxProfit` initialized to 0.
2.  Traverse through each price in the array:
    -   If current price is less than `minPrice`, update `minPrice`.
    -   Else if `price - minPrice` is greater than `maxProfit`, update `maxProfit`.
3.  Return `maxProfit`.

### Complexity

-   **Time Complexity**: $O(n)$ — Single pass through the prices array.
-   **Space Complexity**: $O(1)$ — Only constant extra variables used.

### Java Solution

```java
class Solution {
    public int maxProfit(int[] prices) {
        int minPrice = Integer.MAX_VALUE;
        int maxProfit = 0;
        for (int price : prices) {
            if (price < minPrice) {
                minPrice = price;
            } else if (price - minPrice > maxProfit) {
                maxProfit = price - minPrice;
            }
        }
        return maxProfit;
    }
}
```

---
## 3\. Contains Duplicate

-   **LeetCode**: [217\. Contains Duplicate](https://leetcode.com/problems/contains-duplicate/)
-   **Difficulty**: Easy
-   **Pattern**: Hash Set

### Algorithm

1.  Initialize an empty `HashSet<Integer>`.
2.  Iterate through each integer in `nums`.
3.  If `set.add(num)` returns `false` (meaning the element is already present in the set), return `true`.
4.  If loop completes without finding duplicates, return `false`.

### Complexity

-   **Time Complexity**: $O(n)$ — Linear scan with $O(1)$ average set insertions/lookups.
-   **Space Complexity**: $O(n)$ — HashSet stores up to $n$ elements.

### Java Solution

```java
import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int num : nums) {
            if (!seen.add(num)) {
                return true;
            }
        }
        return false;
    }
}
```

---
## 4\. Product of Array Except Self

-   **LeetCode**: [238\. Product of Array Except Self](https://leetcode.com/problems/product-of-array-except-self/)
-   **Difficulty**: Medium
-   **Pattern**: Prefix and Suffix Products

### Algorithm

1.  Notice that the product except self at index `i` equals `(product of all elements before i) * (product of all elements after i)`.
2.  Initialize result array `res` of size $n$, where `res[0] = 1`.
3.  Make a forward pass: compute prefix products such that `res[i] = res[i - 1] * nums[i - 1]`.
4.  Make a backward pass: maintain a running suffix product `postfix = 1`. Multiply `res[i]` by `postfix`, then update `postfix *= nums[i]`.
5.  Return `res`. This achieves $O(1)$ auxiliary space without using division.

### Complexity

-   **Time Complexity**: $O(n)$ — Two passes over the array of length $n$.
-   **Space Complexity**: $O(1)$ — Auxiliary space (output array does not count toward extra space).

### Java Solution

```java
class Solution {
    public int[] productExceptSelf(int[] nums) {
        int n = nums.length;
        int[] res = new int[n];
        
        // Step 1: Prefix products
        res[0] = 1;
        for (int i = 1; i < n; i++) {
            res[i] = res[i - 1] * nums[i - 1];
        }
        
        // Step 2: Suffix products on the fly
        int postfix = 1;
        for (int i = n - 1; i >= 0; i--) {
            res[i] *= postfix;
            postfix *= nums[i];
        }
        
        return res;
    }
}
```

---
## 5\. Maximum Subarray

-   **LeetCode**: [53\. Maximum Subarray](https://leetcode.com/problems/maximum-subarray/)
-   **Difficulty**: Medium
-   **Pattern**: Kadane's Algorithm / Dynamic Programming

### Algorithm

1.  Kadane's Algorithm maintains a running sum `currentSum` and the global maximum `maxSum`.
2.  Initialize `maxSum = nums[0]` and `currentSum = 0`.
3.  Iterate through each element `x` in `nums`:
    -   If `currentSum < 0`, reset `currentSum = 0` (a negative prefix will only reduce subsequent subarray sums).
    -   Add `x` to `currentSum`.
    -   Update `maxSum = Math.max(maxSum, currentSum)`.
4.  Return `maxSum`.

### Complexity

-   **Time Complexity**: $O(n)$ — Single pass through the array.
-   **Space Complexity**: $O(1)$ — Constant variables.

### Java Solution

```java
class Solution {
    public int maxSubArray(int[] nums) {
        int maxSum = nums[0];
        int currentSum = 0;
        
        for (int num : nums) {
            if (currentSum < 0) {
                currentSum = 0;
            }
            currentSum += num;
            maxSum = Math.max(maxSum, currentSum);
        }
        
        return maxSum;
    }
}
```

---
## 6\. Maximum Product Subarray

-   **LeetCode**: [152\. Maximum Product Subarray](https://leetcode.com/problems/maximum-product-subarray/)
-   **Difficulty**: Medium
-   **Pattern**: Dynamic Programming

### Algorithm

1.  Because multiplying by a negative number flips signs, a negative number multiplied by the minimum negative product can become the new maximum product.
2.  Maintain `curMax`, `curMin`, and `res`, all initialized to `nums[0]`.
3.  For each element `nums[i]` from index 1 to $n - 1$:
    -   If `nums[i] < 0`, swap `curMax` and `curMin`.
    -   Update `curMax = Math.max(nums[i], curMax * nums[i])`.
    -   Update `curMin = Math.min(nums[i], curMin * nums[i])`.
    -   Update `res = Math.max(res, curMax)`.
4.  Return `res`.

### Complexity

-   **Time Complexity**: $O(n)$ — Single pass through array.
-   **Space Complexity**: $O(1)$ — Only scalar state variables.

### Java Solution

```java
class Solution {
    public int maxProduct(int[] nums) {
        int res = nums[0];
        int curMax = nums[0];
        int curMin = nums[0];
        
        for (int i = 1; i < nums.length; i++) {
            int num = nums[i];
            if (num < 0) {
                int temp = curMax;
                curMax = curMin;
                curMin = temp;
            }
            curMax = Math.max(num, curMax * num);
            curMin = Math.min(num, curMin * num);
            res = Math.max(res, curMax);
        }
        
        return res;
    }
}
```

---
## 7\. Find Minimum in Rotated Sorted Array

-   **LeetCode**: [153\. Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/)
-   **Difficulty**: Medium
-   **Pattern**: Binary Search

### Algorithm

1.  In a rotated sorted array without duplicates, binary search can identify the inflection point.
2.  Initialize pointers `left = 0`, `right = nums.length - 1`.
3.  While `left < right`:
    -   Let `mid = left + (right - left) / 2`.
    -   If `nums[mid] > nums[right]`: the minimum must lie strictly to the right of `mid`, so `left = mid + 1`.
    -   Else (`nums[mid] <= nums[right]`): the minimum could be `mid` or to the left, so `right = mid`.
4.  When `left == right`, `nums[left]` points to the minimum element.

### Complexity

-   **Time Complexity**: $O(\log n)$ — Binary search halves search space each iteration.
-   **Space Complexity**: $O(1)$ — Only pointers.

### Java Solution

```java
class Solution {
    public int findMin(int[] nums) {
        int left = 0;
        int right = nums.length - 1;
        
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] > nums[right]) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        
        return nums[left];
    }
}
```

---
## 8\. Search in Rotated Sorted Array

-   **LeetCode**: [33\. Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/)
-   **Difficulty**: Medium
-   **Pattern**: Binary Search

### Algorithm

1.  At any split point `mid`, at least one half of the array (`left` to `mid` or `mid` to `right`) is guaranteed to be strictly sorted.
2.  While `left <= right`:
    -   Let `mid = left + (right - left) / 2`.
    -   If `nums[mid] == target`, return `mid`.
    -   If left half is sorted (`nums[left] <= nums[mid]`):
        -   If `nums[left] <= target && target < nums[mid]`, target is in left half: `right = mid - 1`.
        -   Otherwise, target is in right half: `left = mid + 1`.
    -   Else (right half is sorted):
        -   If `nums[mid] < target && target <= nums[right]`, target is in right half: `left = mid + 1`.
        -   Otherwise, target is in left half: `right = mid - 1`.
3.  If search space is exhausted, return `-1`.

### Complexity

-   **Time Complexity**: $O(\log n)$ — Modified binary search.
-   **Space Complexity**: $O(1)$ — In-place search.

### Java Solution

```java
class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            
            // Check if left half is sorted
            if (nums[left] <= nums[mid]) {
                if (nums[left] <= target && target < nums[mid]) {
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
            } else { // Right half is sorted
                if (nums[mid] < target && target <= nums[right]) {
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            }
        }
        
        return -1;
    }
}
```

---
## 9\. 3Sum

-   **LeetCode**: [15\. 3Sum](https://leetcode.com/problems/3sum/)
-   **Difficulty**: Medium
-   **Pattern**: Two Pointers / Sorting

### Algorithm

1.  Sort the array `nums` in ascending order.
2.  Iterate through `nums` with index `i` from `0` to `n - 3`:
    -   If `nums[i] > 0`, break early since no 3 positive numbers can sum to 0.
    -   If `i > 0` and `nums[i] == nums[i - 1]`, skip to avoid duplicate triplets.
    -   Use two pointers: `left = i + 1`, `right = n - 1`.
    -   While `left < right`:
        -   `sum = nums[i] + nums[left] + nums[right]`.
        -   If `sum == 0`, add triplet to result, advance `left` and decrement `right`. Skip duplicate values for both `left` and `right`.
        -   If `sum < 0`, increment `left`.
        -   If `sum > 0`, decrement `right`.
3.  Return list of triplets.

### Complexity

-   **Time Complexity**: $O(n^2)$ — Sorting is $O(n \log n)$; two-pointer scan takes $O(n)$ for each of the $n$ elements.
-   **Space Complexity**: $O(1)$ or $O(n)$ depending on sorting implementation.

### Java Solution

```java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        List<List<Integer>> res = new ArrayList<>();
        Arrays.sort(nums);
        
        for (int i = 0; i < nums.length - 2; i++) {
            if (nums[i] > 0) break;
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            
            int left = i + 1;
            int right = nums.length - 1;
            
            while (left < right) {
                int sum = nums[i] + nums[left] + nums[right];
                if (sum == 0) {
                    res.add(Arrays.asList(nums[i], nums[left], nums[right]));
                    while (left < right && nums[left] == nums[left + 1]) left++;
                    while (left < right && nums[right] == nums[right - 1]) right--;
                    left++;
                    right--;
                } else if (sum < 0) {
                    left++;
                } else {
                    right--;
                }
            }
        }
        
        return res;
    }
}
```

---
## 10\. Container With Most Water

-   **LeetCode**: [11\. Container With Most Water](https://leetcode.com/problems/container-with-most-water/)
-   **Difficulty**: Medium
-   **Pattern**: Two Pointers

### Algorithm

1.  Place two pointers: `left = 0` and `right = height.length - 1`.
2.  Area formed is `width * min(height[left], height[right])`, where `width = right - left`.
3.  Update `maxArea = Math.max(maxArea, area)`.
4.  Move the pointer pointing to the shorter vertical line inward. The shorter line limits the area; keeping it while reducing width cannot yield a larger area.
5.  Repeat until `left >= right`. Return `maxArea`.

### Complexity

-   **Time Complexity**: $O(n)$ — Pointers move inward by 1 step at each iteration.
-   **Space Complexity**: $O(1)$ — Only pointer variables.

### Java Solution

```java
class Solution {
    public int maxArea(int[] height) {
        int maxArea = 0;
        int left = 0;
        int right = height.length - 1;
        
        while (left < right) {
            int h = Math.min(height[left], height[right]);
            int w = right - left;
            maxArea = Math.max(maxArea, h * w);
            
            if (height[left] < height[right]) {
                left++;
            } else {
                right--;
            }
        }
        
        return maxArea;
    }
}
```

---
# Binary

## 11\. Sum of Two Integers

-   **LeetCode**: [371\. Sum of Two Integers](https://leetcode.com/problems/sum-of-two-integers/)
-   **Difficulty**: Medium
-   **Pattern**: Bit Manipulation

### Algorithm

1.  In binary arithmetic:
    -   Sum without carry is computed with XOR: `a ^ b`.
    -   Carry is computed with AND shifted left by 1: `(a & b) << 1`.
2.  Loop while carry `b != 0`:
    -   Compute `carry = (a & b) << 1`.
    -   Update `a = a ^ b` (add without carry).
    -   Update `b = carry`.
3.  Return `a`.

### Complexity

-   **Time Complexity**: $O(1)$ — In 32-bit integers, the carry loop runs at most 32 times.
-   **Space Complexity**: $O(1)$ — Constant space.

### Java Solution

```java
class Solution {
    public int getSum(int a, int b) {
        while (b != 0) {
            int carry = (a & b) << 1;
            a = a ^ b;
            b = carry;
        }
        return a;
    }
}
```

---
## 12\. Number of 1 Bits

-   **LeetCode**: [191\. Number of 1 Bits](https://leetcode.com/problems/number-of-1-bits/)
-   **Difficulty**: Easy
-   **Pattern**: Bit Manipulation (Brian Kernighan's Algorithm)

### Algorithm

1.  The operation `n & (n - 1)` clears the lowest set bit of `n`.
2.  Count how many times this operation can be performed before `n` becomes 0.
3.  In Java, numbers can be treated as unsigned or handled with standard bit logic.

### Complexity

-   **Time Complexity**: $O(k)$ where $k$ is the number of 1 bits ($k \le 32$).
-   **Space Complexity**: $O(1)$ — No extra space.

### Java Solution

```java
class Solution {
    public int hammingWeight(int n) {
        int count = 0;
        while (n != 0) {
            n = n & (n - 1);
            count++;
        }
        return count;
    }
}
```

---
## 13\. Counting Bits

-   **LeetCode**: [338\. Counting Bits](https://leetcode.com/problems/counting-bits/)
-   **Difficulty**: Easy
-   **Pattern**: Dynamic Programming + Bit Manipulation

### Algorithm

1.  For any number `i`:
    -   If `i` is shifted right by 1 (`i >> 1`), it drops its least significant bit.
    -   The number of 1 bits in `i` equals the number of 1 bits in `i >> 1` plus `(i & 1)`.
2.  State transition: `ans[i] = ans[i >> 1] + (i & 1)`.
3.  Build the array iteratively from `0` to `n`.

### Complexity

-   **Time Complexity**: $O(n)$ — Single pass to compute counts from $0$ to $n$.
-   **Space Complexity**: $O(1)$ — (Output array does not count toward auxiliary space).

### Java Solution

```java
class Solution {
    public int[] countBits(int n) {
        int[] ans = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            ans[i] = ans[i >> 1] + (i & 1);
        }
        return ans;
    }
}
```

---
## 14\. Missing Number

-   **LeetCode**: [268\. Missing Number](https://leetcode.com/problems/missing-number/)
-   **Difficulty**: Easy
-   **Pattern**: Bit Manipulation (XOR) / Gauss Sum

### Algorithm

1.  Using XOR:
    -   `x ^ x = 0` and `x ^ 0 = x`.
    -   If we XOR all numbers from `0` to `n`, and then XOR with every number in `nums`, every number appearing twice cancels out, leaving only the missing number.
2.  Initialize `missing = n`.
3.  For index `i` from `0` to `n - 1`: `missing ^= i ^ nums[i]`.
4.  Return `missing`.

### Complexity

-   **Time Complexity**: $O(n)$ — Single pass through `nums`.
-   **Space Complexity**: $O(1)$ — Only a single variable.

### Java Solution

```java
class Solution {
    public int missingNumber(int[] nums) {
        int missing = nums.length;
        for (int i = 0; i < nums.length; i++) {
            missing ^= i ^ nums[i];
        }
        return missing;
    }
}
```

---
## 15\. Reverse Bits

-   **LeetCode**: [190\. Reverse Bits](https://leetcode.com/problems/reverse-bits/)
-   **Difficulty**: Easy
-   **Pattern**: Bit Manipulation

### Algorithm

1.  Initialize `result = 0`.
2.  Loop 32 times (for each bit of a 32-bit unsigned integer):
    -   Shift `result` left by 1: `result <<= 1`.
    -   Extract the least significant bit of `n`: `(n & 1)`.
    -   Add it to `result`: `result |= (n & 1)`.
    -   Shift `n` right by 1: `n >>>= 1` (logical right shift to prevent sign extension).
3.  Return `result`.

### Complexity

-   **Time Complexity**: $O(1)$ — Exactly 32 iterations.
-   **Space Complexity**: $O(1)$ — Constant extra space.

### Java Solution

```java
class Solution {
    public int reverseBits(int n) {
        int result = 0;
        for (int i = 0; i < 32; i++) {
            result = (result << 1) | (n & 1);
            n >>>= 1;
        }
        return result;
    }
}
```

---
# Dynamic Programming

## 16\. Climbing Stairs

-   **LeetCode**: [70\. Climbing Stairs](https://leetcode.com/problems/climbing-stairs/)
-   **Difficulty**: Easy
-   **Pattern**: Dynamic Programming (Fibonacci)

### Algorithm

1.  To reach step $n$, you must have come from either step $n-1$ (taking 1 step) or step $n-2$ (taking 2 steps).
2.  Recurrence relation: $dp[i] = dp[i - 1] + dp[i - 2]$ with base cases $dp[1] = 1$ and $dp[2] = 2$.
3.  Since we only need the last two values, optimize space to $O(1)$ by using two variables `prev1` and `prev2`.

### Complexity

-   **Time Complexity**: $O(n)$ — Linear iteration up to $n$.
-   **Space Complexity**: $O(1)$ — Only two rolling state variables.

### Java Solution

```java
class Solution {
    public int climbStairs(int n) {
        if (n <= 2) return n;
        int prev2 = 1;
        int prev1 = 2;
        
        for (int i = 3; i <= n; i++) {
            int current = prev1 + prev2;
            prev2 = prev1;
            prev1 = current;
        }
        
        return prev1;
    }
}
```

---
## 17\. Coin Change

-   **LeetCode**: [322\. Coin Change](https://leetcode.com/problems/coin-change/)
-   **Difficulty**: Medium
-   **Pattern**: Unbounded Knapsack / Dynamic Programming

### Algorithm

1.  Define `dp[a]` as the minimum number of coins needed to make amount `a`.
2.  Initialize `dp` array of size `amount + 1` filled with `amount + 1` (a sentinel value representing infinity), and set `dp[0] = 0`.
3.  For each amount `a` from 1 to `amount`:
    -   For each `coin` in `coins`:
        -   If `a - coin >= 0`:
            -   `dp[a] = Math.min(dp[a], 1 + dp[a - coin])`.
4.  If `dp[amount] > amount`, return `-1` (amount cannot be formed). Otherwise return `dp[amount]`.

### Complexity

-   **Time Complexity**: $O(A \times C)$ where $A$ is the target amount and $C$ is the number of coin denominations.
-   **Space Complexity**: $O(A)$ — For the 1D dp array.

### Java Solution

```java
import java.util.Arrays;

class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        
        for (int a = 1; a <= amount; a++) {
            for (int coin : coins) {
                if (a - coin >= 0) {
                    dp[a] = Math.min(dp[a], 1 + dp[a - coin]);
                }
            }
        }
        
        return dp[amount] > amount ? -1 : dp[amount];
    }
}
```

---
## 18\. Longest Increasing Subsequence

-   **LeetCode**: [300\. Longest Increasing Subsequence](https://leetcode.com/problems/longest-increasing-subsequence/)
-   **Difficulty**: Medium
-   **Pattern**: Dynamic Programming / Binary Search (Patience Sorting)

### Algorithm

1.  Maintain an array / list `tails` where `tails[i]` stores the smallest tail of all increasing subsequences of length `i + 1`.
2.  For each number `x` in `nums`:
    -   Use binary search (`Arrays.binarySearch` or custom) to find the insertion point of `x` in `tails`.
    -   If `x` is larger than all elements in `tails`, append it (increasing LIS length).
    -   Otherwise, replace the first element in `tails` that is $\ge x$ with `x` (giving a smaller ending value for subsequences of that length, opening up more future opportunities).
3.  The length of `tails` at the end is the length of the LIS.

### Complexity

-   **Time Complexity**: $O(n \log n)$ — Binary search for each of the $n$ elements.
-   **Space Complexity**: $O(n)$ — Size of tails array in worst case.

### Java Solution

```java
import java.util.Arrays;

class Solution {
    public int lengthOfLIS(int[] nums) {
        int[] tails = new int[nums.length];
        int size = 0;
        
        for (int x : nums) {
            int i = 0, j = size;
            while (i < j) {
                int mid = i + (j - i) / 2;
                if (tails[mid] < x) {
                    i = mid + 1;
                } else {
                    j = mid;
                }
            }
            tails[i] = x;
            if (i == size) size++;
        }
        
        return size;
    }
}
```

---
## 19\. Longest Common Subsequence

-   **LeetCode**: [1143\. Longest Common Subsequence](https://leetcode.com/problems/longest-common-subsequence/)
-   **Difficulty**: Medium
-   **Pattern**: 2D Dynamic Programming

### Algorithm

1.  Let `dp[i][j]` be the length of the LCS of substrings `text1[0...i-1]` and `text2[0...j-1]`.
2.  Base cases: `dp[0][j] = 0` and `dp[i][0] = 0`.
3.  If `text1.charAt(i - 1) == text2.charAt(j - 1)`:
    -   Characters match, so `dp[i][j] = 1 + dp[i - 1][j - 1]`.
4.  Otherwise:
    -   Characters do not match, take the maximum from excluding either character:
    -   `dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])`.
5.  Return `dp[m][n]`.

### Complexity

-   **Time Complexity**: $O(m \times n)$ where $m$ and $n$ are the lengths of `text1` and `text2`.
-   **Space Complexity**: $O(m \times n)$ — Can also be optimized to $O(\min(m, n))$ space.

### Java Solution

```java
class Solution {
    public int longestCommonSubsequence(String text1, String text2) {
        int m = text1.length(), n = text2.length();
        int[][] dp = new int[m + 1][n + 1];
        
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
                    dp[i][j] = 1 + dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        return dp[m][n];
    }
}
```

---
## 20\. Word Break

-   **LeetCode**: [139\. Word Break](https://leetcode.com/problems/word-break/)
-   **Difficulty**: Medium
-   **Pattern**: Dynamic Programming / Trie

### Algorithm

1.  Store words from `wordDict` in a `HashSet<String>` for $O(1)$ average lookup time.
2.  Let boolean `dp[i]` indicate whether substring `s[0...i-1]` can be segmented into valid dictionary words.
3.  Base case: `dp[0] = true` (empty string is always valid).
4.  For `i` from 1 to `s.length()`:
    -   For `j` from 0 to `i - 1`:
        -   If `dp[j]` is `true` and the substring `s.substring(j, i)` is in the dictionary:
            -   Set `dp[i] = true` and break inner loop.
5.  Return `dp[s.length()]`.

### Complexity

-   **Time Complexity**: $O(n^2 \times k)$ where $n$ is length of `s` and $k$ is substring hash calculation time.
-   **Space Complexity**: $O(n + m)$ where $m$ is size of the word set.

### Java Solution

```java
import java.util.HashSet;
import java.util.List;
import java.util.Set;

class Solution {
    public boolean wordBreak(String s, List<String> wordDict) {
        Set<String> dict = new HashSet<>(wordDict);
        boolean[] dp = new boolean[s.length() + 1];
        dp[0] = true;
        
        for (int i = 1; i <= s.length(); i++) {
            for (int j = 0; j < i; j++) {
                if (dp[j] && dict.contains(s.substring(j, i))) {
                    dp[i] = true;
                    break;
                }
            }
        }
        
        return dp[s.length()];
    }
}
```

---
## 21\. Combination Sum IV

-   **LeetCode**: [377\. Combination Sum IV](https://leetcode.com/problems/combination-sum-iv/)
-   **Difficulty**: Medium
-   **Pattern**: Dynamic Programming (Permutations with Sum)

### Algorithm

1.  Let `dp[i]` be the number of permutations that sum up to `i`.
2.  Base case: `dp[0] = 1` (one way to form target 0: select no elements).
3.  For each sum `i` from 1 to `target`:
    -   For each number `num` in `nums`:
        -   If `i - num >= 0`:
            -   `dp[i] += dp[i - num]`.
4.  Return `dp[target]`.

### Complexity

-   **Time Complexity**: $O(\text{target} \times n)$ where $n$ is the length of `nums`.
-   **Space Complexity**: $O(\text{target})$ — For the dp array.

### Java Solution

```java
class Solution {
    public int combinationSum4(int[] nums, int target) {
        int[] dp = new int[target + 1];
        dp[0] = 1;
        
        for (int i = 1; i <= target; i++) {
            for (int num : nums) {
                if (i - num >= 0) {
                    dp[i] += dp[i - num];
                }
            }
        }
        
        return dp[target];
    }
}
```

---
## 22\. House Robber

-   **LeetCode**: [198\. House Robber](https://leetcode.com/problems/house-robber/)
-   **Difficulty**: Medium
-   **Pattern**: Dynamic Programming

### Algorithm

1.  At each house `i`, a robber has two choices:
    -   Rob current house: gain `nums[i]` plus the max loot from house `i - 2`.
    -   Skip current house: retain the max loot up to house `i - 1`.
2.  State transition: `dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i])`.
3.  Since only the last two values are needed, use two variables `prev1` and `prev2` to achieve $O(1)$ space.

### Complexity

-   **Time Complexity**: $O(n)$ — Single pass through houses.
-   **Space Complexity**: $O(1)$ — Only two scalar variables.

### Java Solution

```java
class Solution {
    public int rob(int[] nums) {
        int prev2 = 0;
        int prev1 = 0;
        
        for (int num : nums) {
            int current = Math.max(prev1, prev2 + num);
            prev2 = prev1;
            prev1 = current;
        }
        
        return prev1;
    }
}
```

---
## 23\. House Robber II

-   **LeetCode**: [213\. House Robber II](https://leetcode.com/problems/house-robber-ii/)
-   **Difficulty**: Medium
-   **Pattern**: Dynamic Programming (Circular Array)

### Algorithm

1.  Because houses are arranged in a circle, the first and last houses are neighbors and cannot both be robbed.
2.  The problem decomposes into two standard linear House Robber subproblems:
    -   Case 1: Rob houses from index `0` to `n - 2` (exclude the last house).
    -   Case 2: Rob houses from index `1` to `n - 1` (exclude the first house).
3.  The answer is `Math.max(robLinear(nums, 0, n - 2), robLinear(nums, 1, n - 1))`.
4.  Special case: if `n == 1`, return `nums[0]`.

### Complexity

-   **Time Complexity**: $O(n)$ — Two passes of linear house robber.
-   **Space Complexity**: $O(1)$ — Constant space.

### Java Solution

```java
class Solution {
    public int rob(int[] nums) {
        if (nums.length == 1) return nums[0];
        
        return Math.max(
            robRange(nums, 0, nums.length - 2),
            robRange(nums, 1, nums.length - 1)
        );
    }
    
    private int robRange(int[] nums, int start, int end) {
        int prev2 = 0, prev1 = 0;
        for (int i = start; i <= end; i++) {
            int current = Math.max(prev1, prev2 + nums[i]);
            prev2 = prev1;
            prev1 = current;
        }
        return prev1;
    }
}
```

---
## 24\. Decode Ways

-   **LeetCode**: [91\. Decode Ways](https://leetcode.com/problems/decode-ways/)
-   **Difficulty**: Medium
-   **Pattern**: Dynamic Programming

### Algorithm

1.  Let `dp[i]` be the number of ways to decode substring of length `i` (`s[0...i-1]`).
2.  Base cases: `dp[0] = 1`, and if `s[0] == '0'` return 0.
3.  For each position `i` from 1 to `s.length()`:
    -   Check single digit `s[i - 1]`: If between `'1'` and `'9'`, `dp[i] += dp[i - 1]`.
    -   Check two digits `s[i - 2...i - 1]`: If the 2-digit number is between `10` and `26`, `dp[i] += dp[i - 2]`.
4.  Can be space-optimized to $O(1)$ using `prev1` and `prev2`.

### Complexity

-   **Time Complexity**: $O(n)$ — Single pass of string.
-   **Space Complexity**: $O(1)$ — Using two variables instead of full array.

### Java Solution

```java
class Solution {
    public int numDecodings(String s) {
        if (s == null || s.length() == 0 || s.charAt(0) == '0') return 0;
        
        int prev2 = 1; // dp[0]
        int prev1 = 1; // dp[1]
        
        for (int i = 1; i < s.length(); i++) {
            int current = 0;
            int singleDigit = s.charAt(i) - '0';
            int twoDigits = Integer.parseInt(s.substring(i - 1, i + 1));
            
            if (singleDigit >= 1 && singleDigit <= 9) {
                current += prev1;
            }
            if (twoDigits >= 10 && twoDigits <= 26) {
                current += prev2;
            }
            
            prev2 = prev1;
            prev1 = current;
        }
        
        return prev1;
    }
}
```

---
## 25\. Unique Paths

-   **LeetCode**: [62\. Unique Paths](https://leetcode.com/problems/unique-paths/)
-   **Difficulty**: Medium
-   **Pattern**: 2D Dynamic Programming / Combinatorics

### Algorithm

1.  The robot can only move down or right.
2.  To reach cell `(r, c)`, the robot must come from `(r - 1, c)` or `(r, c - 1)`.
3.  Transition: `dp[c] = dp[c] + dp[c - 1]` when using a 1D row array initialized to 1.
4.  Iterate row by row and update values.
5.  Return `dp[n - 1]`.

### Complexity

-   **Time Complexity**: $O(m \times n)$ — Grid traversal.
-   **Space Complexity**: $O(n)$ — 1D space optimization.

### Java Solution

```java
import java.util.Arrays;

class Solution {
    public int uniquePaths(int m, int n) {
        int[] dp = new int[n];
        Arrays.fill(dp, 1);
        
        for (int r = 1; r < m; r++) {
            for (int c = 1; c < n; c++) {
                dp[c] += dp[c - 1];
            }
        }
        
        return dp[n - 1];
    }
}
```

---
## 26\. Jump Game

-   **LeetCode**: [55\. Jump Game](https://leetcode.com/problems/jump-game/)
-   **Difficulty**: Medium
-   **Pattern**: Greedy

### Algorithm

1.  Track the furthest index reachable so far: `maxReach = 0`.
2.  Iterate through each index `i` in `nums`:
    -   If `i > maxReach`, the current index cannot be reached; return `false`.
    -   Update `maxReach = Math.max(maxReach, i + nums[i])`.
    -   If `maxReach >= nums.length - 1`, return `true` immediately.
3.  Return `true` if loop completes.

### Complexity

-   **Time Complexity**: $O(n)$ — Single pass.
-   **Space Complexity**: $O(1)$ — Single integer variable.

### Java Solution

```java
class Solution {
    public boolean canJump(int[] nums) {
        int maxReach = 0;
        for (int i = 0; i < nums.length; i++) {
            if (i > maxReach) {
                return false;
            }
            maxReach = Math.max(maxReach, i + nums[i]);
            if (maxReach >= nums.length - 1) {
                return true;
            }
        }
        return true;
    }
}
```

---
# Graph

## 27\. Clone Graph

-   **LeetCode**: [133\. Clone Graph](https://leetcode.com/problems/clone-graph/)
-   **Difficulty**: Medium
-   **Pattern**: Graph DFS / BFS / Hash Map

### Algorithm

1.  Use a `HashMap<Node, Node>` to map original nodes to their cloned counterparts to prevent infinite loops from cycles and handle shared neighbors.
2.  If `node == null`, return `null`.
3.  In DFS helper:
    -   If the current node is already in the map, return the cloned node from the map.
    -   Otherwise, create a copy `new Node(node.val)`.
    -   Store the pair in the map: `map.put(node, clone)`.
    -   Iterate through `node.neighbors`: recursively call DFS and add the returned cloned neighbors to `clone.neighbors`.
4.  Return `clone`.

### Complexity

-   **Time Complexity**: $O(V + E)$ — Visits each vertex and traverses each edge once.
-   **Space Complexity**: $O(V)$ — Hash map and recursion stack up to $V$ nodes.

### Java Solution

```java
import java.util.*;

/*
class Node {
    public int val;
    public List<Node> neighbors;
    public Node() { val = 0; neighbors = new ArrayList<Node>(); }
    public Node(int _val) { val = _val; neighbors = new ArrayList<Node>(); }
    public Node(int _val, ArrayList<Node> _neighbors) { val = _val; neighbors = _neighbors; }
}
*/

class Solution {
    private Map<Node, Node> visited = new HashMap<>();
    
    public Node cloneGraph(Node node) {
        if (node == null) return null;
        if (visited.containsKey(node)) return visited.get(node);
        
        Node clone = new Node(node.val);
        visited.put(node, clone);
        
        for (Node neighbor : node.neighbors) {
            clone.neighbors.add(cloneGraph(neighbor));
        }
        
        return clone;
    }
}
```

---
## 28\. Course Schedule

-   **LeetCode**: [207\. Course Schedule](https://leetcode.com/problems/course-schedule/)
-   **Difficulty**: Medium
-   **Pattern**: Topological Sort (Kahn's Algorithm / Cycle Detection in Directed Graph)

### Algorithm

1.  Build an adjacency list for the directed graph and an `inDegree` array of length `numCourses`.
2.  For each edge `[course, prereq]`, add `course` to `adj.get(prereq)` and increment `inDegree[course]`.
3.  Add all courses with `inDegree[i] == 0` to a queue.
4.  While the queue is not empty:
    -   Poll course `curr`, increment `completedCourses` counter.
    -   For each neighbor of `curr`, decrement its in-degree.
    -   If a neighbor's in-degree drops to 0, add it to the queue.
5.  If `completedCourses == numCourses`, return `true` (no cycle); otherwise return `false`.

### Complexity

-   **Time Complexity**: $O(V + E)$ where $V = \text{numCourses}$ and $E = \text{prerequisites.length}$.
-   **Space Complexity**: $O(V + E)$ — For adjacency list, queue, and in-degree array.

### Java Solution

```java
import java.util.*;

class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) {
            adj.add(new ArrayList<>());
        }
        
        int[] inDegree = new int[numCourses];
        for (int[] pre : prerequisites) {
            int course = pre[0];
            int prereq = pre[1];
            adj.get(prereq).add(course);
            inDegree[course]++;
        }
        
        Queue<Integer> queue = new LinkedList<>();
        for (int i = 0; i < numCourses; i++) {
            if (inDegree[i] == 0) {
                queue.offer(i);
            }
        }
        
        int completed = 0;
        while (!queue.isEmpty()) {
            int curr = queue.poll();
            completed++;
            for (int next : adj.get(curr)) {
                inDegree[next]--;
                if (inDegree[next] == 0) {
                    queue.offer(next);
                }
            }
        }
        
        return completed == numCourses;
    }
}
```

---
## 29\. Pacific Atlantic Water Flow

-   **LeetCode**: [417\. Pacific Atlantic Water Flow](https://leetcode.com/problems/pacific-atlantic-water-flow/)
-   **Difficulty**: Medium
-   **Pattern**: Graph DFS / BFS (Reverse Reachability)

### Algorithm

1.  Instead of checking if water from each cell flows down to both oceans, reverse the thinking: start DFS/BFS from ocean borders and move inland uphill (cells with equal or higher height).
2.  Maintain two boolean matrices: `pacific[m][n]` and `atlantic[m][n]`.
3.  Run DFS starting from:
    -   Pacific borders: top row and left column.
    -   Atlantic borders: bottom row and right column.
4.  In DFS, only traverse to adjacent cells that have height $\ge$ current cell's height and have not yet been reached for that ocean.
5.  Cells where `pacific[r][c] && atlantic[r][c]` is `true` can flow to both oceans.

### Complexity

-   **Time Complexity**: $O(m \times n)$ — Each cell is visited at most twice (once for each ocean).
-   **Space Complexity**: $O(m \times n)$ — For the boolean matrices and recursion call stack.

### Java Solution

```java
import java.util.*;

class Solution {
    private int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    
    public List<List<Integer>> pacificAtlantic(int[][] heights) {
        List<List<Integer>> result = new ArrayList<>();
        if (heights == null || heights.length == 0) return result;
        
        int m = heights.length, n = heights[0].length;
        boolean[][] pacific = new boolean[m][n];
        boolean[][] atlantic = new boolean[m][n];
        
        // Horizontal borders
        for (int c = 0; c < n; c++) {
            dfs(heights, 0, c, pacific, heights[0][c]);
            dfs(heights, m - 1, c, atlantic, heights[m - 1][c]);
        }
        
        // Vertical borders
        for (int r = 0; r < m; r++) {
            dfs(heights, r, 0, pacific, heights[r][0]);
            dfs(heights, r, n - 1, atlantic, heights[r][n - 1]);
        }
        
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                if (pacific[r][c] && atlantic[r][c]) {
                    result.add(Arrays.asList(r, c));
                }
            }
        }
        
        return result;
    }
    
    private void dfs(int[][] heights, int r, int c, boolean[][] visited, int prevHeight) {
        if (r < 0 || r >= heights.length || c < 0 || c >= heights[0].length ||
            visited[r][c] || heights[r][c] < prevHeight) {
            return;
        }
        
        visited[r][c] = true;
        for (int[] dir : dirs) {
            dfs(heights, r + dir[0], c + dir[1], visited, heights[r][c]);
        }
    }
}
```

---
## 30\. Number of Islands

-   **LeetCode**: [200\. Number of Islands](https://leetcode.com/problems/number-of-islands/)
-   **Difficulty**: Medium
-   **Pattern**: Graph DFS / BFS / Connected Components

### Algorithm

1.  Traverse through every cell in the grid `(r, c)`.
2.  When a land cell `'1'` is encountered:
    -   Increment the island counter.
    -   Run DFS to mark all connected land cells in 4 directions as visited by sinking them (setting cell to `'0'`).
3.  Water cells `'0'` and already sunk cells are ignored.
4.  Return island count.

### Complexity

-   **Time Complexity**: $O(m \times n)$ — Every cell is visited a constant number of times.
-   **Space Complexity**: $O(m \times n)$ — Worst case recursion call stack (grid filled with land).

### Java Solution

```java
class Solution {
    public int numIslands(char[][] grid) {
        if (grid == null || grid.length == 0) return 0;
        
        int islands = 0;
        int m = grid.length, n = grid[0].length;
        
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == '1') {
                    islands++;
                    dfs(grid, r, c);
                }
            }
        }
        
        return islands;
    }
    
    private void dfs(char[][] grid, int r, int c) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] != '1') {
            return;
        }
        grid[r][c] = '0'; // Sink island cell
        dfs(grid, r + 1, c);
        dfs(grid, r - 1, c);
        dfs(grid, r, c + 1);
        dfs(grid, r, c - 1);
    }
}
```

---
## 31\. Longest Consecutive Sequence

-   **LeetCode**: [128\. Longest Consecutive Sequence](https://leetcode.com/problems/longest-consecutive-sequence/)
-   **Difficulty**: Medium
-   **Pattern**: Hash Set / Array

### Algorithm

1.  Insert all numbers from `nums` into a `HashSet<Integer>`.
2.  Iterate through each number `num` in the set:
    -   Check if `num` is the start of a consecutive sequence by verifying `!set.contains(num - 1)`.
    -   If it is the start, count forward: while `set.contains(currentNum + 1)`, increment `currentNum` and current streak.
    -   Update `longestStreak = Math.max(longestStreak, currentStreak)`.
3.  Return `longestStreak`.
4.  Only checking when `!set.contains(num - 1)` ensures each number is part of a forward while loop at most once.

### Complexity

-   **Time Complexity**: $O(n)$ — Each element is visited at most twice.
-   **Space Complexity**: $O(n)$ — For storing elements in HashSet.

### Java Solution

```java
import java.util.HashSet;
import java.util.Set;

class Solution {
    public int longestConsecutive(int[] nums) {
        Set<Integer> set = new HashSet<>();
        for (int num : nums) {
            set.add(num);
        }
        
        int longestStreak = 0;
        
        for (int num : set) {
            // Only start streak if num is the beginning of a sequence
            if (!set.contains(num - 1)) {
                int currentNum = num;
                int currentStreak = 1;
                
                while (set.contains(currentNum + 1)) {
                    currentNum++;
                    currentStreak++;
                }
                
                longestStreak = Math.max(longestStreak, currentStreak);
            }
        }
        
        return longestStreak;
    }
}
```

---
## 32\. Alien Dictionary

-   **LeetCode**: [269\. Alien Dictionary](https://leetcode.com/problems/alien-dictionary/)
-   **Difficulty**: Hard
-   **Pattern**: Topological Sort / Directed Graph

### Algorithm

1.  Initialize an adjacency list and an in-degree map for all unique characters across `words`.
2.  Compare adjacent word pairs `words[i]` and `words[i + 1]`:
    -   If `words[i]` is longer than `words[i + 1]` and starts with `words[i + 1]`, the ordering is invalid; return `""`.
    -   Find the first differing character `c1` and `c2`: add directed edge `c1 -> c2` and increment `inDegree[c2]`. Break once first mismatch is found.
3.  Add characters with `inDegree == 0` to a queue.
4.  Process queue (Kahn's BFS): append polled character to result builder and decrement neighbors' in-degree.
5.  If the result length equals the number of unique characters, return string; else return `""` (cycle detected).

### Complexity

-   **Time Complexity**: $O(C)$ where $C$ is total length of all words.
-   **Space Complexity**: $O(U + E) = O(1)$ since alien alphabet has at most 26 lowercase English letters.

### Java Solution

```java
import java.util.*;

class Solution {
    public String alienOrder(String[] words) {
        Map<Character, Set<Character>> adj = new HashMap<>();
        Map<Character, Integer> inDegree = new HashMap<>();
        
        for (String word : words) {
            for (char c : word.toCharArray()) {
                adj.putIfAbsent(c, new HashSet<>());
                inDegree.putIfAbsent(c, 0);
            }
        }
        
        for (int i = 0; i < words.length - 1; i++) {
            String w1 = words[i], w2 = words[i + 1];
            if (w1.length() > w2.length() && w1.startsWith(w2)) {
                return ""; // Prefix condition violation
            }
            int len = Math.min(w1.length(), w2.length());
            for (int j = 0; j < len; j++) {
                char c1 = w1.charAt(j);
                char c2 = w2.charAt(j);
                if (c1 != c2) {
                    if (!adj.get(c1).contains(c2)) {
                        adj.get(c1).add(c2);
                        inDegree.put(c2, inDegree.get(c2) + 1);
                    }
                    break;
                }
            }
        }
        
        Queue<Character> queue = new LinkedList<>();
        for (char c : inDegree.keySet()) {
            if (inDegree.get(c) == 0) {
                queue.offer(c);
            }
        }
        
        StringBuilder sb = new StringBuilder();
        while (!queue.isEmpty()) {
            char curr = queue.poll();
            sb.append(curr);
            for (char next : adj.get(curr)) {
                inDegree.put(next, inDegree.get(next) - 1);
                if (inDegree.get(next) == 0) {
                    queue.offer(next);
                }
            }
        }
        
        return sb.length() == inDegree.size() ? sb.toString() : "";
    }
}
```

---
## 33\. Graph Valid Tree

-   **LeetCode**: [261\. Graph Valid Tree](https://leetcode.com/problems/graph-valid-tree/)
-   **Difficulty**: Medium
-   **Pattern**: Disjoint Set Union (Union-Find) / Graph DFS

### Algorithm

1.  A valid tree with $n$ nodes must satisfy two properties:
    -   Exactly $n - 1$ edges.
    -   Fully connected with no cycles.
2.  If `edges.length != n - 1`, return `false` immediately.
3.  Use Union-Find (Disjoint Set Union):
    -   Initialize parent array where `parent[i] = i`.
    -   For each edge `[u, v]`:
        -   Find roots of `u` and `v`.
        -   If `rootU == rootV`, a cycle is detected; return `false`.
        -   Otherwise, union them.
4.  If all $n - 1$ edges are processed without a cycle, the graph is a valid tree.

### Complexity

-   **Time Complexity**: $O(n \cdot \alpha(n)) \approx O(n)$ where $\alpha$ is the Inverse Ackermann function.
-   **Space Complexity**: $O(n)$ — Union-find parent array.

### Java Solution

```java
class Solution {
    public boolean validTree(int n, int[][] edges) {
        if (edges.length != n - 1) return false;
        
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        
        for (int[] edge : edges) {
            int rootU = find(parent, edge[0]);
            int rootV = find(parent, edge[1]);
            
            if (rootU == rootV) return false; // Cycle detected
            parent[rootU] = rootV;
        }
        
        return true;
    }
    
    private int find(int[] parent, int i) {
        if (parent[i] == i) return i;
        return parent[i] = find(parent, parent[i]); // Path compression
    }
}
```

---
## 34\. Number of Connected Components in an Undirected Graph

-   **LeetCode**: [323\. Number of Connected Components in an Undirected Graph](https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/)
-   **Difficulty**: Medium
-   **Pattern**: Union-Find / DFS / BFS

### Algorithm

1.  Initialize components count `count = n`.
2.  Initialize `parent` array where each node is initially its own parent: `parent[i] = i`.
3.  For each undirected edge `[u, v]`:
    -   Find the roots of `u` and `v`.
    -   If they have different roots, union them and decrement `count`.
4.  Return `count` after processing all edges.

### Complexity

-   **Time Complexity**: $O(E \cdot \alpha(V))$ — Near linear with path compression and rank.
-   **Space Complexity**: $O(V)$ — Parent array.

### Java Solution

```java
class Solution {
    public int countComponents(int n, int[][] edges) {
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        
        int count = n;
        for (int[] edge : edges) {
            int root1 = find(parent, edge[0]);
            int root2 = find(parent, edge[1]);
            if (root1 != root2) {
                parent[root1] = root2;
                count--;
            }
        }
        return count;
    }
    
    private int find(int[] parent, int i) {
        if (parent[i] == i) return i;
        return parent[i] = find(parent, parent[i]);
    }
}
```

---
# Interval

## 35\. Insert Interval

-   **LeetCode**: [57\. Insert Interval](https://leetcode.com/problems/insert-interval/)
-   **Difficulty**: Medium
-   **Pattern**: Intervals

### Algorithm

1.  Iterate through `intervals`:
    -   While intervals end before `newInterval` starts (`interval[1] < newInterval[0]`), add them directly to result.
    -   While intervals overlap with `newInterval` (`interval[0] <= newInterval[1]`):
        -   Merge by updating `newInterval[0] = Math.min(newInterval[0], interval[0])`.
        -   Update `newInterval[1] = Math.max(newInterval[1], interval[1])`.
    -   Add the merged `newInterval`.
    -   Add all remaining intervals that start after `newInterval` ends.
2.  Return merged list converted to 2D array.

### Complexity

-   **Time Complexity**: $O(n)$ — Single linear pass.
-   **Space Complexity**: $O(n)$ — Result list.

### Java Solution

```java
import java.util.ArrayList;
import java.util.List;

class Solution {
    public int[][] insert(int[][] intervals, int[] newInterval) {
        List<int[]> result = new ArrayList<>();
        int i = 0, n = intervals.length;
        
        // Add all intervals ending before newInterval starts
        while (i < n && intervals[i][1] < newInterval[0]) {
            result.add(intervals[i]);
            i++;
        }
        
        // Merge all overlapping intervals
        while (i < n && intervals[i][0] <= newInterval[1]) {
            newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
            newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
            i++;
        }
        result.add(newInterval);
        
        // Add remaining intervals
        while (i < n) {
            result.add(intervals[i]);
            i++;
        }
        
        return result.toArray(new int[result.size()][]);
    }
}
```

---
## 36\. Merge Intervals

-   **LeetCode**: [56\. Merge Intervals](https://leetcode.com/problems/merge-intervals/)
-   **Difficulty**: Medium
-   **Pattern**: Intervals / Sorting

### Algorithm

1.  Sort intervals by start time: `Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]))`.
2.  Initialize `merged` list and add the first interval.
3.  Iterate through subsequent intervals:
    -   Let `last` be the last interval in `merged`.
    -   If current interval overlaps with `last` (`curr[0] <= last[1]`):
        -   Merge by extending `last[1] = Math.max(last[1], curr[1])`.
    -   Otherwise, append `curr` to `merged`.
4.  Return `merged` converted to array.

### Complexity

-   **Time Complexity**: $O(n \log n)$ — Dominated by sorting.
-   **Space Complexity**: $O(n)$ — For storing the result list.

### Java Solution

```java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

class Solution {
    public int[][] merge(int[][] intervals) {
        if (intervals.length <= 1) return intervals;
        
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> result = new ArrayList<>();
        
        int[] current = intervals[0];
        result.add(current);
        
        for (int[] interval : intervals) {
            if (interval[0] <= current[1]) {
                current[1] = Math.max(current[1], interval[1]);
            } else {
                current = interval;
                result.add(current);
            }
        }
        
        return result.toArray(new int[result.size()][]);
    }
}
```

---
## 37\. Non-overlapping Intervals

-   **LeetCode**: [435\. Non-overlapping Intervals](https://leetcode.com/problems/non-overlapping-intervals/)
-   **Difficulty**: Medium
-   **Pattern**: Greedy / Interval Scheduling

### Algorithm

1.  To minimize removals, greedily maximize the number of non-overlapping intervals kept.
2.  Sort intervals by their **end times** in ascending order.
3.  Track `prevEnd = Integer.MIN_VALUE` and `count = 0` (removals).
4.  For each interval:
    -   If `interval[0] >= prevEnd`, there is no overlap; update `prevEnd = interval[1]`.
    -   Otherwise, there is an overlap; remove this interval (increment `count`).
5.  Return `count`.

### Complexity

-   **Time Complexity**: $O(n \log n)$ — Due to sorting.
-   **Space Complexity**: $O(1)$ or $O(n)$ depending on sort implementation.

### Java Solution

```java
import java.util.Arrays;

class Solution {
    public int eraseOverlapIntervals(int[][] intervals) {
        if (intervals.length == 0) return 0;
        
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));
        
        int removals = 0;
        int prevEnd = intervals[0][1];
        
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] < prevEnd) {
                removals++; // Overlap detected; remove interval with later end time
            } else {
                prevEnd = intervals[i][1];
            }
        }
        
        return removals;
    }
}
```

---
## 38\. Meeting Rooms

-   **LeetCode**: [252\. Meeting Rooms](https://leetcode.com/problems/meeting-rooms/)
-   **Difficulty**: Easy
-   **Pattern**: Intervals / Sorting

### Algorithm

1.  Sort meetings by their start times: `Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]))`.
2.  Check adjacent pairs from `1` to `intervals.length - 1`:
    -   If current meeting starts before previous meeting ends (`intervals[i][0] < intervals[i - 1][1]`), a person cannot attend both meetings; return `false`.
3.  If no overlaps are found, return `true`.

### Complexity

-   **Time Complexity**: $O(n \log n)$ — Sorting intervals.
-   **Space Complexity**: $O(1)$ — In-place check.

### Java Solution

```java
import java.util.Arrays;

class Solution {
    public boolean canAttendMeetings(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] < intervals[i - 1][1]) {
                return false;
            }
        }
        
        return true;
    }
}
```

---
## 39\. Meeting Rooms II

-   **LeetCode**: [253\. Meeting Rooms II](https://leetcode.com/problems/meeting-rooms-ii/)
-   **Difficulty**: Medium
-   **Pattern**: Intervals / Min-Heap / Two Pointers

### Algorithm

1.  Separate start times and end times into two arrays: `starts` and `ends`.
2.  Sort both arrays in ascending order.
3.  Use two pointers `startPtr` and `endPtr` along with `rooms = 0`:
    -   If `starts[startPtr] < ends[endPtr]`, a new meeting starts before an ongoing one ends: increment `rooms` and advance `startPtr`.
    -   Otherwise, an ongoing meeting has ended: advance `endPtr` and advance `startPtr` (room is reused).
4.  Return `rooms`.

### Complexity

-   **Time Complexity**: $O(n \log n)$ — Sorting two arrays of size $n$.
-   **Space Complexity**: $O(n)$ — Storing start and end times.

### Java Solution

```java
import java.util.Arrays;

class Solution {
    public int minMeetingRooms(int[][] intervals) {
        int n = intervals.length;
        int[] starts = new int[n];
        int[] ends = new int[n];
        
        for (int i = 0; i < n; i++) {
            starts[i] = intervals[i][0];
            ends[i] = intervals[i][1];
        }
        
        Arrays.sort(starts);
        Arrays.sort(ends);
        
        int rooms = 0;
        int endPtr = 0;
        
        for (int startPtr = 0; startPtr < n; startPtr++) {
            if (starts[startPtr] < ends[endPtr]) {
                rooms++;
            } else {
                endPtr++;
            }
        }
        
        return rooms;
    }
}
```

---
# Linked List

## 40\. Reverse Linked List

-   **LeetCode**: [206\. Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/)
-   **Difficulty**: Easy
-   **Pattern**: Linked List In-Place Reversal

### Algorithm

1.  Maintain three pointers: `prev = null`, `curr = head`, and `next = null`.
2.  While `curr != null`:
    -   Store next node: `next = curr.next`.
    -   Reverse pointer: `curr.next = prev`.
    -   Advance `prev = curr`.
    -   Advance `curr = next`.
3.  Return `prev` as the new head.

### Complexity

-   **Time Complexity**: $O(n)$ — Single pass through list.
-   **Space Complexity**: $O(1)$ — In-place reversal.

### Java Solution

```java
/*
public class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
*/

class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        
        return prev;
    }
}
```

---
## 41\. Detect Cycle in a Linked List

-   **LeetCode**: [141\. Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/)
-   **Difficulty**: Easy
-   **Pattern**: Fast and Slow Pointers (Floyd's Cycle-Finding Algorithm)

### Algorithm

1.  Initialize two pointers: `slow = head` and `fast = head`.
2.  Move `slow` by 1 step (`slow = slow.next`) and `fast` by 2 steps (`fast = fast.next.next`).
3.  If there is a cycle, `fast` will eventually catch up with `slow` (`slow == fast`).
4.  If `fast == null` or `fast.next == null`, the end of the list is reached, meaning no cycle exists.

### Complexity

-   **Time Complexity**: $O(n)$ — Linear time.
-   **Space Complexity**: $O(1)$ — Only two pointers.

### Java Solution

```java
public class Solution {
    public boolean hasCycle(ListNode head) {
        if (head == null) return false;
        
        ListNode slow = head;
        ListNode fast = head;
        
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                return true;
            }
        }
        
        return false;
    }
}
```

---
## 42\. Merge Two Sorted Lists

-   **LeetCode**: [21\. Merge Two Sorted Lists](https://leetcode.com/problems/merge-two-sorted-lists/)
-   **Difficulty**: Easy
-   **Pattern**: Two Pointers / Dummy Head

### Algorithm

1.  Create a dummy head node `dummy = new ListNode(0)` and a `tail` pointer pointing to `dummy`.
2.  While both `list1 != null` and `list2 != null`:
    -   If `list1.val <= list2.val`, attach `list1` to `tail.next` and advance `list1`.
    -   Else attach `list2` to `tail.next` and advance `list2`.
    -   Advance `tail`.
3.  If either list remains, attach it directly: `tail.next = (list1 != null) ? list1 : list2`.
4.  Return `dummy.next`.

### Complexity

-   **Time Complexity**: $O(n + m)$ where $n$ and $m$ are lengths of the lists.
-   **Space Complexity**: $O(1)$ — Merging is done by rewiring existing node pointers.

### Java Solution

```java
class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) {
                tail.next = list1;
                list1 = list1.next;
            } else {
                tail.next = list2;
                list2 = list2.next;
            }
            tail = tail.next;
        }
        
        tail.next = (list1 != null) ? list1 : list2;
        return dummy.next;
    }
}
```

---
## 43\. Merge k Sorted Lists

-   **LeetCode**: [23\. Merge k Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/)
-   **Difficulty**: Hard
-   **Pattern**: PriorityQueue (Min-Heap) / Divide and Conquer

### Algorithm

1.  Use a `PriorityQueue<ListNode>` ordered by node value: `(a, b) -> Integer.compare(a.val, b.val)`.
2.  Add the head of each non-empty list to the priority queue.
3.  While the heap is not empty:
    -   Poll the minimum node `minNode` and append it to `tail.next`.
    -   If `minNode.next != null`, push `minNode.next` into the heap.
    -   Advance `tail`.
4.  Return `dummy.next`.

### Complexity

-   **Time Complexity**: $O(N \log k)$ where $N$ is total number of nodes across all $k$ lists.
-   **Space Complexity**: $O(k)$ — Priority queue holds at most $k$ elements at any time.

### Java Solution

```java
import java.util.PriorityQueue;

class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        if (lists == null || lists.length == 0) return null;
        
        PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> Integer.compare(a.val, b.val));
        
        for (ListNode node : lists) {
            if (node != null) {
                pq.offer(node);
            }
        }
        
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        
        while (!pq.isEmpty()) {
            ListNode curr = pq.poll();
            tail.next = curr;
            tail = tail.next;
            
            if (curr.next != null) {
                pq.offer(curr.next);
            }
        }
        
        return dummy.next;
    }
}
```

---
## 44\. Remove Nth Node From End of List

-   **LeetCode**: [19\. Remove Nth Node From End of List](https://leetcode.com/problems/remove-nth-node-from-end-of-list/)
-   **Difficulty**: Medium
-   **Pattern**: Fast and Slow Pointers / Dummy Node

### Algorithm

1.  Use a dummy node `dummy` pointing to `head` to gracefully handle deletion of the first node.
2.  Position two pointers `fast = dummy` and `slow = dummy`.
3.  Advance `fast` pointer $n + 1$ steps forward so the gap between `fast` and `slow` is $n + 1$.
4.  Move both `fast` and `slow` one step at a time until `fast == null`.
5.  `slow.next` is now the target node to delete: `slow.next = slow.next.next`.
6.  Return `dummy.next`.

### Complexity

-   **Time Complexity**: $O(L)$ where $L$ is list length — One pass.
-   **Space Complexity**: $O(1)$ — Only two pointers.

### Java Solution

```java
class Solution {
    public ListNode removeNthFromEnd(ListNode head, int n) {
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        ListNode fast = dummy;
        ListNode slow = dummy;
        
        // Advance fast by n + 1 steps
        for (int i = 0; i <= n; i++) {
            fast = fast.next;
        }
        
        // Move both until fast reaches the end
        while (fast != null) {
            fast = fast.next;
            slow = slow.next;
        }
        
        // Delete the node
        slow.next = slow.next.next;
        return dummy.next;
    }
}
```

---
## 45\. Reorder List

-   **LeetCode**: [143\. Reorder List](https://leetcode.com/problems/reorder-list/)
-   **Difficulty**: Medium
-   **Pattern**: Fast & Slow Pointers + Reverse + Merge

### Algorithm

1.  **Find middle**: Use fast and slow pointers to find the middle of the linked list.
2.  **Reverse second half**: Split the list into two halves and reverse the second half in-place.
3.  **Merge halves**: Interleave nodes from the first half and the reversed second half alternately.

### Complexity

-   **Time Complexity**: $O(n)$ — Step 1 takes $O(n/2)$, Step 2 takes $O(n/2)$, Step 3 takes $O(n/2)$. Total $O(n)$.
-   **Space Complexity**: $O(1)$ — In-place pointer manipulation.

### Java Solution

```java
class Solution {
    public void reorderList(ListNode head) {
        if (head == null || head.next == null) return;
        
        // Step 1: Find middle
        ListNode slow = head, fast = head;
        while (fast.next != null && fast.next.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        
        // Step 2: Reverse second half
        ListNode second = reverse(slow.next);
        slow.next = null; // Break list into two halves
        
        // Step 3: Merge two halves alternately
        ListNode first = head;
        while (second != null) {
            ListNode tmp1 = first.next;
            ListNode tmp2 = second.next;
            
            first.next = second;
            second.next = tmp1;
            
            first = tmp1;
            second = tmp2;
        }
    }
    
    private ListNode reverse(ListNode head) {
        ListNode prev = null, curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
}
```

---
# Matrix

## 46\. Set Matrix Zeroes

-   **LeetCode**: [73\. Set Matrix Zeroes](https://leetcode.com/problems/set-matrix-zeroes/)
-   **Difficulty**: Medium
-   **Pattern**: In-Place Matrix State Marking

### Algorithm

1.  Instead of using $O(m + n)$ extra space, use the matrix's first row and first column as markers.
2.  Use a boolean variable `firstRowZero` to record whether the first row initially has any zeros.
3.  Iterate through matrix: if `matrix[r][c] == 0`, mark `matrix[r][0] = 0` and `matrix[0][c] = 0` (if `r == 0`, set `firstRowZero = true`).
4.  Iterate from `r = 1` to `m - 1` and `c = 1` to `n - 1`: if `matrix[r][0] == 0 || matrix[0][c] == 0`, set `matrix[r][c] = 0`.
5.  If `matrix[0][0] == 0`, zero out the first column.
6.  If `firstRowZero` is true, zero out the first row.

### Complexity

-   **Time Complexity**: $O(m \times n)$ — Two passes over matrix.
-   **Space Complexity**: $O(1)$ — Modifies matrix in place without additional memory.

### Java Solution

```java
class Solution {
    public void setZeroes(int[][] matrix) {
        int m = matrix.length, n = matrix[0].length;
        boolean firstRowZero = false;
        
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                if (matrix[r][c] == 0) {
                    if (r == 0) {
                        firstRowZero = true;
                    } else {
                        matrix[r][0] = 0;
                    }
                    matrix[0][c] = 0;
                }
            }
        }
        
        for (int r = 1; r < m; r++) {
            for (int c = 1; c < n; c++) {
                if (matrix[r][0] == 0 || matrix[0][c] == 0) {
                    matrix[r][c] = 0;
                }
            }
        }
        
        // Zero out first column if needed
        if (matrix[0][0] == 0) {
            for (int r = 0; r < m; r++) {
                matrix[r][0] = 0;
            }
        }
        
        // Zero out first row if needed
        if (firstRowZero) {
            for (int c = 0; c < n; c++) {
                matrix[0][c] = 0;
            }
        }
    }
}
```

---
## 47\. Spiral Matrix

-   **LeetCode**: [54\. Spiral Matrix](https://leetcode.com/problems/spiral-matrix/)
-   **Difficulty**: Medium
-   **Pattern**: Matrix Simulation / Boundary Traversal

### Algorithm

1.  Maintain four boundary variables: `top = 0`, `bottom = m - 1`, `left = 0`, `right = n - 1`.
2.  While `top <= bottom` and `left <= right`:
    -   Traverse right along `top` row: `col` from `left` to `right`. Increment `top`.
    -   Traverse down along `right` column: `row` from `top` to `bottom`. Decrement `right`.
    -   If `top <= bottom`: traverse left along `bottom` row: `col` from `right` down to `left`. Decrement `bottom`.
    -   If `left <= right`: traverse up along `left` column: `row` from `bottom` down to `top`. Increment `left`.
3.  Return the collected spiral list.

### Complexity

-   **Time Complexity**: $O(m \times n)$ — Each element visited once.
-   **Space Complexity**: $O(1)$ — (Output list does not count as auxiliary space).

### Java Solution

```java
import java.util.ArrayList;
import java.util.List;

class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> res = new ArrayList<>();
        if (matrix == null || matrix.length == 0) return res;
        
        int top = 0, bottom = matrix.length - 1;
        int left = 0, right = matrix[0].length - 1;
        
        while (top <= bottom && left <= right) {
            // Traverse right
            for (int c = left; c <= right; c++) res.add(matrix[top][c]);
            top++;
            
            // Traverse down
            for (int r = top; r <= bottom; r++) res.add(matrix[r][right]);
            right--;
            
            // Traverse left
            if (top <= bottom) {
                for (int c = right; c >= left; c--) res.add(matrix[bottom][c]);
                bottom--;
            }
            
            // Traverse up
            if (left <= right) {
                for (int r = bottom; r >= top; r--) res.add(matrix[r][left]);
                left++;
            }
        }
        
        return res;
    }
}
```

---
## 48\. Rotate Image

-   **LeetCode**: [48\. Rotate Image](https://leetcode.com/problems/rotate-image/)
-   **Difficulty**: Medium
-   **Pattern**: Matrix Transpose and Reflect

### Algorithm

1.  A 90-degree clockwise rotation is mathematically equivalent to:
    -   **Transpose** the matrix (reflect along the main diagonal: swap `matrix[i][j]` with `matrix[j][i]`).
    -   **Reverse each row** horizontally (swap `matrix[i][left]` with `matrix[i][right]`).
2.  Both operations can be done cleanly in-place with $O(1)$ extra space.

### Complexity

-   **Time Complexity**: $O(n^2)$ — Transposing takes $n^2 / 2$ operations and reversing takes $n^2 / 2$ operations.
-   **Space Complexity**: $O(1)$ — Performed entirely in place.

### Java Solution

```java
class Solution {
    public void rotate(int[][] matrix) {
        int n = matrix.length;
        
        // Step 1: Transpose matrix
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int temp = matrix[i][j];
                matrix[i][j] = matrix[j][i];
                matrix[j][i] = temp;
            }
        }
        
        // Step 2: Reverse each row
        for (int i = 0; i < n; i++) {
            int left = 0, right = n - 1;
            while (left < right) {
                int temp = matrix[i][left];
                matrix[i][left] = matrix[i][right];
                matrix[i][right] = temp;
                left++;
                right--;
            }
        }
    }
}
```

---
## 49\. Word Search

-   **LeetCode**: [79\. Word Search](https://leetcode.com/problems/word-search/)
-   **Difficulty**: Medium
-   **Pattern**: Backtracking / DFS

### Algorithm

1.  Iterate through every cell `(r, c)` in the board.
2.  If `board[r][c] == word.charAt(0)`, initiate backtracking search.
3.  In backtracking `dfs(r, c, idx)`:
    -   If `idx == word.length()`, the entire word is found; return `true`.
    -   If `(r, c)` is out of bounds or `board[r][c] != word.charAt(idx)`, return `false`.
    -   Temporarily mark cell as visited by modifying `board[r][c] = '#'`.
    -   Recurse in 4 cardinal directions for `idx + 1`.
    -   Backtrack by restoring `board[r][c]` to its original character.
4.  If any starting cell succeeds, return `true`; else return `false`.

### Complexity

-   **Time Complexity**: $O(m \times n \times 4^L)$ where $L$ is word length.
-   **Space Complexity**: $O(L)$ — Recursion call stack depth.

### Java Solution

```java
class Solution {
    public boolean exist(char[][] board, String word) {
        int m = board.length, n = board[0].length;
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                if (dfs(board, word, r, c, 0)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    private boolean dfs(char[][] board, String word, int r, int c, int idx) {
        if (idx == word.length()) return true;
        if (r < 0 || r >= board.length || c < 0 || c >= board[0].length || board[r][c] != word.charAt(idx)) {
            return false;
        }
        
        char temp = board[r][c];
        board[r][c] = '#'; // Mark visited
        
        boolean found = dfs(board, word, r + 1, c, idx + 1) ||
                        dfs(board, word, r - 1, c, idx + 1) ||
                        dfs(board, word, r, c + 1, idx + 1) ||
                        dfs(board, word, r, c - 1, idx + 1);
                        
        board[r][c] = temp; // Backtrack
        return found;
    }
}
```

---
# String

## 50\. Longest Substring Without Repeating Characters

-   **LeetCode**: [3\. Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/)
-   **Difficulty**: Medium
-   **Pattern**: Sliding Window / Hash Map

### Algorithm

1.  Maintain a sliding window `[left, right]` and a hash map (or array) storing the last seen index of each character.
2.  Initialize `maxLen = 0` and `left = 0`.
3.  For `right` from 0 to `s.length() - 1`:
    -   If `s.charAt(right)` was seen at index `lastIndex >= left`, jump `left = lastIndex + 1`.
    -   Update character's last seen index to `right`.
    -   Update `maxLen = Math.max(maxLen, right - left + 1)`.
4.  Return `maxLen`.

### Complexity

-   **Time Complexity**: $O(n)$ — `right` pointer iterates once; `left` pointer only moves forward.
-   **Space Complexity**: $O(\min(m, n))$ — Hash map / array of alphabet size $m$.

### Java Solution

```java
import java.util.HashMap;
import java.util.Map;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> lastSeen = new HashMap<>();
        int maxLen = 0;
        int left = 0;
        
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (lastSeen.containsKey(c)) {
                left = Math.max(left, lastSeen.get(c) + 1);
            }
            lastSeen.put(c, right);
            maxLen = Math.max(maxLen, right - left + 1);
        }
        
        return maxLen;
    }
}
```

---
## 51\. Longest Repeating Character Replacement

-   **LeetCode**: [424\. Longest Repeating Character Replacement](https://leetcode.com/problems/longest-repeating-character-replacement/)
-   **Difficulty**: Medium
-   **Pattern**: Sliding Window

### Algorithm

1.  Maintain a frequency array `count` for characters in the window and track `maxCount` (frequency of the most frequent character in current window).
2.  For each character at `right`, increment its frequency and update `maxCount`.
3.  Window length is `right - left + 1`. The number of characters that need replacing is `(windowLen - maxCount)`.
4.  If `(windowLen - maxCount) > k`, shrink the window by decrementing `count[s.charAt(left)]` and incrementing `left`.
5.  Max window size ever achieved is `right - left + 1`. Return `maxLength`.

### Complexity

-   **Time Complexity**: $O(n)$ — Both pointers move from 0 to $n$.
-   **Space Complexity**: $O(1)$ — Array of size 26 for uppercase English letters.

### Java Solution

```java
class Solution {
    public int characterReplacement(String s, int k) {
        int[] count = new int[26];
        int left = 0;
        int maxFreq = 0;
        int maxLen = 0;
        
        for (int right = 0; right < s.length(); right++) {
            maxFreq = Math.max(maxFreq, ++count[s.charAt(right) - 'A']);
            
            while ((right - left + 1) - maxFreq > k) {
                count[s.charAt(left) - 'A']--;
                left++;
            }
            
            maxLen = Math.max(maxLen, right - left + 1);
        }
        
        return maxLen;
    }
}
```

---
## 52\. Minimum Window Substring

-   **LeetCode**: [76\. Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/)
-   **Difficulty**: Hard
-   **Pattern**: Sliding Window / Frequency Map

### Algorithm

1.  Build a target frequency map for all characters in string `t`. Let `required` be the number of unique characters needed.
2.  Maintain a window `[left, right]` and track `formed` (unique characters that match required frequency in current window).
3.  Expand window by moving `right`:
    -   If `s.charAt(right)` is in target map and matches the target count, increment `formed`.
4.  While `formed == required` (valid window):
    -   Record window if its length is smaller than `minLen`.
    -   Contract window from `left`: decrement frequency of `s.charAt(left)`.
    -   If its count falls below target count, decrement `formed`.
    -   Advance `left`.
5.  Return shortest recorded substring or `""` if none found.

### Complexity

-   **Time Complexity**: $O(|S| + |T|)$ — Each character in $S$ visited at most twice.
-   **Space Complexity**: $O(|S| + |T|)$ — Character frequency maps.

### Java Solution

```java
import java.util.HashMap;
import java.util.Map;

class Solution {
    public String minWindow(String s, String t) {
        if (s.length() == 0 || t.length() == 0) return "";
        
        Map<Character, Integer> targetMap = new HashMap<>();
        for (char c : t.toCharArray()) {
            targetMap.put(c, targetMap.getOrDefault(c, 0) + 1);
        }
        
        int required = targetMap.size();
        int left = 0, right = 0;
        int formed = 0;
        
        Map<Character, Integer> windowCounts = new HashMap<>();
        int[] ans = {-1, 0, 0}; // len, left, right
        
        while (right < s.length()) {
            char c = s.charAt(right);
            windowCounts.put(c, windowCounts.getOrDefault(c, 0) + 1);
            
            if (targetMap.containsKey(c) && windowCounts.get(c).intValue() == targetMap.get(c).intValue()) {
                formed++;
            }
            
            while (left <= right && formed == required) {
                if (ans[0] == -1 || (right - left + 1) < ans[0]) {
                    ans[0] = right - left + 1;
                    ans[1] = left;
                    ans[2] = right;
                }
                
                char leftChar = s.charAt(left);
                windowCounts.put(leftChar, windowCounts.get(leftChar) - 1);
                if (targetMap.containsKey(leftChar) && windowCounts.get(leftChar).intValue() < targetMap.get(leftChar).intValue()) {
                    formed--;
                }
                left++;
            }
            right++;
        }
        
        return ans[0] == -1 ? "" : s.substring(ans[1], ans[2] + 1);
    }
}
```

---
## 53\. Valid Anagram

-   **LeetCode**: [242\. Valid Anagram](https://leetcode.com/problems/valid-anagram/)
-   **Difficulty**: Easy
-   **Pattern**: Hash Table / Frequency Array

### Algorithm

1.  If lengths of `s` and `t` differ, return `false`.
2.  Use a fixed-size frequency array of size 26.
3.  For each character in `s`, increment its count.
4.  For each character in `t`, decrement its count.
5.  If any index in the array is non-zero, return `false`; otherwise return `true`.

### Complexity

-   **Time Complexity**: $O(n)$ — Single pass through strings of length $n$.
-   **Space Complexity**: $O(1)$ — Constant size 26 integer array.

### Java Solution

```java
class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        
        int[] counts = new int[26];
        for (int i = 0; i < s.length(); i++) {
            counts[s.charAt(i) - 'a']++;
            counts[t.charAt(i) - 'a']--;
        }
        
        for (int count : counts) {
            if (count != 0) return false;
        }
        
        return true;
    }
}
```

---
## 54\. Group Anagrams

-   **LeetCode**: [49\. Group Anagrams](https://leetcode.com/problems/group-anagrams/)
-   **Difficulty**: Medium
-   **Pattern**: Hash Map / Canonical Sorting

### Algorithm

1.  Anagrams have identical character frequencies and identical sorted character representations.
2.  For each string in `strs`:
    -   Convert string to `char[]`, sort it, and convert back to `String key`.
    -   Add original string to `map.computeIfAbsent(key, k -> new ArrayList<>()).add(s)`.
3.  Return `new ArrayList<>(map.values())`.

### Complexity

-   **Time Complexity**: $O(N \cdot K \log K)$ where $N$ is number of strings and $K$ is maximum length of a string.
-   **Space Complexity**: $O(N \cdot K)$ — Hash map storing all strings.

### Java Solution

```java
import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> map = new HashMap<>();
        
        for (String s : strs) {
            char[] chars = s.toCharArray();
            Arrays.sort(chars);
            String key = new String(chars);
            
            map.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }
        
        return new ArrayList<>(map.values());
    }
}
```

---
## 55\. Valid Parentheses

-   **LeetCode**: [20\. Valid Parentheses](https://leetcode.com/problems/valid-parentheses/)
-   **Difficulty**: Easy
-   **Pattern**: Stack

### Algorithm

1.  Maintain an explicit `Stack<Character>`.
2.  Iterate through each character `c` in string `s`:
    -   If `c` is `'('`, push `')'`.
    -   If `c` is `'{'`, push `'}'`.
    -   If `c` is `'['`, push `']'`.
    -   Otherwise (`c` is a closing bracket):
        -   If stack is empty or `stack.pop() != c`, brackets are unbalanced; return `false`.
3.  At the end, return `stack.isEmpty()`.

### Complexity

-   **Time Complexity**: $O(n)$ — Single pass through string.
-   **Space Complexity**: $O(n)$ — Stack can store up to $n$ characters.

### Java Solution

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        
        for (char c : s.toCharArray()) {
            if (c == '(') {
                stack.push(')');
            } else if (c == '{') {
                stack.push('}');
            } else if (c == '[') {
                stack.push(']');
            } else if (stack.isEmpty() || stack.pop() != c) {
                return false;
            }
        }
        
        return stack.isEmpty();
    }
}
```

---
## 56\. Valid Palindrome

-   **LeetCode**: [125\. Valid Palindrome](https://leetcode.com/problems/valid-palindrome/)
-   **Difficulty**: Easy
-   **Pattern**: Two Pointers

### Algorithm

1.  Use two pointers: `left = 0` and `right = s.length() - 1`.
2.  While `left < right`:
    -   While `left < right` and `s.charAt(left)` is not alphanumeric, increment `left`.
    -   While `left < right` and `s.charAt(right)` is not alphanumeric, decrement `right`.
    -   Compare lowercased characters: if `Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))`, return `false`.
    -   Increment `left`, decrement `right`.
3.  If pointers cross without mismatch, return `true`.

### Complexity

-   **Time Complexity**: $O(n)$ — Pointers traverse the string once.
-   **Space Complexity**: $O(1)$ — In-place check without creating a cleaned string copy.

### Java Solution

```java
class Solution {
    public boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) {
                left++;
            }
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) {
                right--;
            }
            
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) {
                return false;
            }
            
            left++;
            right--;
        }
        
        return true;
    }
}
```

---
## 57\. Longest Palindromic Substring

-   **LeetCode**: [5\. Longest Palindromic Substring](https://leetcode.com/problems/longest-palindromic-substring/)
-   **Difficulty**: Medium
-   **Pattern**: Expand Around Centers

### Algorithm

1.  A palindrome mirrors around its center. There are $2n - 1$ potential centers in a string of length $n$ (each character and each pair of adjacent characters).
2.  For each index `i` from 0 to `s.length() - 1`:
    -   Expand around single center: `expand(i, i)` (odd length palindrome).
    -   Expand around double center: `expand(i, i + 1)` (even length palindrome).
3.  In `expand(left, right)`: while characters match within bounds, decrement `left` and increment `right`.
4.  Keep track of the longest palindrome boundaries `[start, end]`. Return `s.substring(start, end + 1)`.

### Complexity

-   **Time Complexity**: $O(n^2)$ — Expanding around each center takes up to $O(n)$ time.
-   **Space Complexity**: $O(1)$ — Only coordinate variables.

### Java Solution

```java
class Solution {
    private int start = 0, maxLen = 0;
    
    public String longestPalindrome(String s) {
        if (s == null || s.length() < 2) return s;
        
        for (int i = 0; i < s.length(); i++) {
            expandAroundCenter(s, i, i);     // Odd length
            expandAroundCenter(s, i, i + 1); // Even length
        }
        
        return s.substring(start, start + maxLen);
    }
    
    private void expandAroundCenter(String s, int left, int right) {
        while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
            left--;
            right++;
        }
        int len = right - left - 1;
        if (len > maxLen) {
            maxLen = len;
            start = left + 1;
        }
    }
}
```

---
## 58\. Palindromic Substrings

-   **LeetCode**: [647\. Palindromic Substrings](https://leetcode.com/problems/palindromic-substrings/)
-   **Difficulty**: Medium
-   **Pattern**: Expand Around Centers

### Algorithm

1.  Similar to finding the longest palindrome, expand around all $2n - 1$ possible centers.
2.  For each center `(i, i)` and `(i, i + 1)`:
    -   While within bounds and `s.charAt(left) == s.charAt(right)`:
        -   Increment palindrome count.
        -   Decrement `left`, increment `right`.
3.  Return total count.

### Complexity

-   **Time Complexity**: $O(n^2)$ — Up to $O(n)$ checks per center.
-   **Space Complexity**: $O(1)$ — Constant extra space.

### Java Solution

```java
class Solution {
    public int countSubstrings(String s) {
        int count = 0;
        for (int i = 0; i < s.length(); i++) {
            count += countPalindromesAroundCenter(s, i, i);     // Odd length
            count += countPalindromesAroundCenter(s, i, i + 1); // Even length
        }
        return count;
    }
    
    private int countPalindromesAroundCenter(String s, int left, int right) {
        int count = 0;
        while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
            count++;
            left--;
            right++;
        }
        return count;
    }
}
```

---
## 59\. Encode and Decode Strings

-   **LeetCode**: [271\. Encode and Decode Strings](https://leetcode.com/problems/encode-and-decode-strings/)
-   **Difficulty**: Medium
-   **Pattern**: String Formatting / Length Prefix Delimiter

### Algorithm

1.  **Encode**: For each string `s`, prefix it with its length followed by a delimiter `#`: `s.length() + "#" + s`.
    -   Example: `["lint","code","love","you"]` $\to$ `"4#lint4#code4#love3#you"`.
2.  **Decode**: Maintain an index `i = 0`.
    -   Find the delimiter `#` starting from `i`: `slash = s.indexOf('#', i)`.
    -   Parse length `len = Integer.parseInt(s.substring(i, slash))`.
    -   Extract the word: `s.substring(slash + 1, slash + 1 + len)`.
    -   Advance `i = slash + 1 + len`.
3.  Because length is stored explicitly, words can contain any characters (including `#` and empty strings) without ambiguity.

### Complexity

-   **Time Complexity**: $O(N)$ for both encode and decode, where $N$ is total characters across all strings.
-   **Space Complexity**: $O(1)$ auxiliary space.

### Java Solution

```java
import java.util.ArrayList;
import java.util.List;

public class Codec {
    // Encodes a list of strings to a single string.
    public String encode(List<String> strs) {
        StringBuilder sb = new StringBuilder();
        for (String s : strs) {
            sb.append(s.length()).append('#').append(s);
        }
        return sb.toString();
    }

    // Decodes a single string to a list of strings.
    public List<String> decode(String s) {
        List<String> result = new ArrayList<>();
        int i = 0;
        
        while (i < s.length()) {
            int slash = s.indexOf('#', i);
            int len = Integer.parseInt(s.substring(i, slash));
            i = slash + 1;
            result.add(s.substring(i, i + len));
            i += len;
        }
        
        return result;
    }
}
```

---
# Tree

## 60\. Maximum Depth of Binary Tree

-   **LeetCode**: [104\. Maximum Depth of Binary Tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/)
-   **Difficulty**: Easy
-   **Pattern**: Tree DFS / Recursion

### Algorithm

1.  If `root == null`, depth is `0`.
2.  Recursively find max depth of left subtree: `maxDepth(root.left)`.
3.  Recursively find max depth of right subtree: `maxDepth(root.right)`.
4.  Return `1 + Math.max(leftDepth, rightDepth)`.

### Complexity

-   **Time Complexity**: $O(n)$ — Visits each node once.
-   **Space Complexity**: $O(h)$ where $h$ is height of tree ($O(\log n)$ balanced, $O(n)$ worst case).

### Java Solution

```java
/*
public class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}
*/

class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }
}
```

---
## 61\. Same Tree

-   **LeetCode**: [100\. Same Tree](https://leetcode.com/problems/same-tree/)
-   **Difficulty**: Easy
-   **Pattern**: Tree DFS / Recursion

### Algorithm

1.  If both `p == null` and `q == null`, trees match at this branch; return `true`.
2.  If only one of them is `null`, or `p.val != q.val`, they do not match; return `false`.
3.  Recursively check both subtrees: `isSameTree(p.left, q.left) && isSameTree(p.right, q.right)`.

### Complexity

-   **Time Complexity**: $O(n)$ — Traverses both trees simultaneously.
-   **Space Complexity**: $O(h)$ — Call stack proportional to tree height.

### Java Solution

```java
class Solution {
    public boolean isSameTree(TreeNode p, TreeNode q) {
        if (p == null && q == null) return true;
        if (p == null || q == null || p.val != q.val) return false;
        
        return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
    }
}
```

---
## 62\. Invert Binary Tree

-   **LeetCode**: [226\. Invert Binary Tree](https://leetcode.com/problems/invert-binary-tree/)
-   **Difficulty**: Easy
-   **Pattern**: Tree DFS / Post-order Traversal

### Algorithm

1.  Base case: if `root == null`, return `null`.
2.  Recursively invert the left and right subtrees.
3.  Swap `root.left` and `root.right`.
4.  Return `root`.

### Complexity

-   **Time Complexity**: $O(n)$ — Visits each node once.
-   **Space Complexity**: $O(h)$ — Call stack up to tree height.

### Java Solution

```java
class Solution {
    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;
        
        TreeNode left = invertTree(root.left);
        TreeNode right = invertTree(root.right);
        
        root.left = right;
        root.right = left;
        
        return root;
    }
}
```

---
## 63\. Binary Tree Maximum Path Sum

-   **LeetCode**: [124\. Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/)
-   **Difficulty**: Hard
-   **Pattern**: Tree DFS / Post-order

### Algorithm

1.  Maintain a global `maxSum` initialized to `Integer.MIN_VALUE`.
2.  In recursive helper `maxGain(node)`:
    -   If `node == null`, return 0.
    -   Compute max gain from left child: `Math.max(0, maxGain(node.left))` (ignore negative paths).
    -   Compute max gain from right child: `Math.max(0, maxGain(node.right))`.
    -   The price of a new path with `node` as highest point is `node.val + leftGain + rightGain`. Update `maxSum`.
    -   Return to parent the maximum branch contribution: `node.val + Math.max(leftGain, rightGain)`.
3.  Return `maxSum`.

### Complexity

-   **Time Complexity**: $O(n)$ — Each node visited once.
-   **Space Complexity**: $O(h)$ — Call stack up to tree height.

### Java Solution

```java
class Solution {
    private int maxSum = Integer.MIN_VALUE;
    
    public int maxPathSum(TreeNode root) {
        maxGain(root);
        return maxSum;
    }
    
    private int maxGain(TreeNode node) {
        if (node == null) return 0;
        
        int leftGain = Math.max(0, maxGain(node.left));
        int rightGain = Math.max(0, maxGain(node.right));
        
        int currentPathSum = node.val + leftGain + rightGain;
        maxSum = Math.max(maxSum, currentPathSum);
        
        return node.val + Math.max(leftGain, rightGain);
    }
}
```

---
## 64\. Binary Tree Level Order Traversal

-   **LeetCode**: [102\. Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/)
-   **Difficulty**: Medium
-   **Pattern**: BFS / Queue

### Algorithm

1.  Use a `Queue<TreeNode>` initialized with `root` (if not null).
2.  While queue is not empty:
    -   Determine current level size: `int levelSize = queue.size()`.
    -   Poll `levelSize` elements, collect their values into `levelList`, and enqueue their non-null children.
    -   Add `levelList` to results.
3.  Return results.

### Complexity

-   **Time Complexity**: $O(n)$ — Visits every node once.
-   **Space Complexity**: $O(n)$ — Queue stores at most $n/2$ nodes at the bottom level.

### Java Solution

```java
import java.util.*;

class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> res = new ArrayList<>();
        if (root == null) return res;
        
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        
        while (!queue.isEmpty()) {
            int levelSize = queue.size();
            List<Integer> currentLevel = new ArrayList<>();
            
            for (int i = 0; i < levelSize; i++) {
                TreeNode node = queue.poll();
                currentLevel.add(node.val);
                if (node.left != null) queue.offer(node.left);
                if (node.right != null) queue.offer(node.right);
            }
            
            res.add(currentLevel);
        }
        
        return res;
    }
}
```

---
## 65\. Serialize and Deserialize Binary Tree

-   **LeetCode**: [297\. Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/)
-   **Difficulty**: Hard
-   **Pattern**: Tree DFS / Pre-order Traversal

### Algorithm

1.  **Serialize**: Pre-order traversal (Root, Left, Right). Append `node.val` separated by commas `,`. Represent null pointers as `"#"`.
2.  **Deserialize**: Split serialized string by `,` into a queue.
    -   Poll first token: if `"#"`, return `null`.
    -   Otherwise, create `new TreeNode(Integer.parseInt(val))`.
    -   Recursively deserialize left child, then right child.
    -   Return root.

### Complexity

-   **Time Complexity**: $O(n)$ for both serialize and deserialize.
-   **Space Complexity**: $O(n)$ — String representation and recursion stack.

### Java Solution

```java
import java.util.*;

public class Codec {
    // Encodes a tree to a single string.
    public String serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        buildString(root, sb);
        return sb.toString();
    }
    
    private void buildString(TreeNode node, StringBuilder sb) {
        if (node == null) {
            sb.append("#,");
        } else {
            sb.append(node.val).append(",");
            buildString(node.left, sb);
            buildString(node.right, sb);
        }
    }

    // Decodes your encoded data to tree.
    public TreeNode deserialize(String data) {
        Queue<String> nodes = new LinkedList<>(Arrays.asList(data.split(",")));
        return buildTree(nodes);
    }
    
    private TreeNode buildTree(Queue<String> nodes) {
        String val = nodes.poll();
        if (val.equals("#")) return null;
        
        TreeNode node = new TreeNode(Integer.parseInt(val));
        node.left = buildTree(nodes);
        node.right = buildTree(nodes);
        return node;
    }
}
```

---
## 66\. Subtree of Another Tree

-   **LeetCode**: [572\. Subtree of Another Tree](https://leetcode.com/problems/subtree-of-another-tree/)
-   **Difficulty**: Easy
-   **Pattern**: Tree DFS / Same Tree Check

### Algorithm

1.  If `root == null`, return `false`.
2.  Check if current tree is identical to `subRoot` using helper `isSameTree(root, subRoot)`.
3.  If not identical, check if `subRoot` is a subtree of either the left or right child:
    -   `isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot)`.

### Complexity

-   **Time Complexity**: $O(m \times n)$ where $m$ and $n$ are nodes in `root` and `subRoot`.
-   **Space Complexity**: $O(h)$ — Call stack height.

### Java Solution

```java
class Solution {
    public boolean isSubtree(TreeNode root, TreeNode subRoot) {
        if (root == null) return false;
        if (isSame(root, subRoot)) return true;
        return isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
    }
    
    private boolean isSame(TreeNode s, TreeNode t) {
        if (s == null && t == null) return true;
        if (s == null || t == null || s.val != t.val) return false;
        return isSame(s.left, t.left) && isSame(s.right, t.right);
    }
}
```

---
## 67\. Construct Binary Tree from Preorder and Inorder Traversal

-   **LeetCode**: [105\. Construct Binary Tree from Preorder and Inorder Traversal](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/)
-   **Difficulty**: Medium
-   **Pattern**: Tree Recursion / Divide and Conquer / Hash Map

### Algorithm

1.  In preorder traversal, the first element is always the root.
2.  In inorder traversal, elements to the left of the root value belong to the left subtree; elements to the right belong to the right subtree.
3.  Build a hash map of `inorder` values to their indices for $O(1)$ lookups.
4.  Maintain a running `preorderIndex`.
5.  Helper `build(inLeft, inRight)`:
    -   If `inLeft > inRight`, return `null`.
    -   Take `rootVal = preorder[preorderIndex++]`.
    -   Create `root = new TreeNode(rootVal)`.
    -   Let `mid = inMap.get(rootVal)`.
    -   Construct `root.left = build(inLeft, mid - 1)`.
    -   Construct `root.right = build(mid + 1, inRight)`.
    -   Return `root`.

### Complexity

-   **Time Complexity**: $O(n)$ — Each node processed once with $O(1)$ index lookup.
-   **Space Complexity**: $O(n)$ — Hash map and tree recursion stack.

### Java Solution

```java
import java.util.HashMap;
import java.util.Map;

class Solution {
    private int preorderIndex = 0;
    private Map<Integer, Integer> inorderIndexMap = new HashMap<>();
    
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        for (int i = 0; i < inorder.length; i++) {
            inorderIndexMap.put(inorder[i], i);
        }
        return arrayToTree(preorder, 0, inorder.length - 1);
    }
    
    private TreeNode arrayToTree(int[] preorder, int left, int right) {
        if (left > right) return null;
        
        int rootValue = preorder[preorderIndex++];
        TreeNode root = new TreeNode(rootValue);
        
        int mid = inorderIndexMap.get(rootValue);
        root.left = arrayToTree(preorder, left, mid - 1);
        root.right = arrayToTree(preorder, mid + 1, right);
        
        return root;
    }
}
```

---
## 68\. Validate Binary Search Tree

-   **LeetCode**: [98\. Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/)
-   **Difficulty**: Medium
-   **Pattern**: Tree DFS with Min/Max Bounds

### Algorithm

1.  Every node in a BST must satisfy: `low < node.val < high`.
2.  The initial range for root is $(-\infty, +\infty)$.
3.  When recursing left: upper bound becomes `node.val` (`low, node.val`).
4.  When recursing right: lower bound becomes `node.val` (`node.val, high`).
5.  Use `Long` (or null boxed objects) to prevent integer overflow when node values equal `Integer.MIN_VALUE` or `Integer.MAX_VALUE`.

### Complexity

-   **Time Complexity**: $O(n)$ — Visits every node once.
-   **Space Complexity**: $O(h)$ — Recursion call stack.

### Java Solution

```java
class Solution {
    public boolean isValidBST(TreeNode root) {
        return validate(root, null, null);
    }
    
    private boolean validate(TreeNode node, Integer low, Integer high) {
        if (node == null) return true;
        
        if ((low != null && node.val <= low) || (high != null && node.val >= high)) {
            return false;
        }
        
        return validate(node.left, low, node.val) && validate(node.right, node.val, high);
    }
}
```

---
## 69\. Kth Smallest Element in a BST

-   **LeetCode**: [230\. Kth Smallest Element in a BST](https://leetcode.com/problems/kth-smallest-element-in-a-bst/)
-   **Difficulty**: Medium
-   **Pattern**: Inorder Traversal (Iterative with Stack)

### Algorithm

1.  An inorder traversal of a BST visits nodes in strictly ascending sorted order.
2.  Traverse iteratively using a stack:
    -   Push all left descendants onto stack.
    -   Pop node: this is the next smallest element.
    -   Decrement `k`. If `k == 0`, return `node.val`.
    -   Move to right child: `curr = node.right`.

### Complexity

-   **Time Complexity**: $O(h + k)$ — Stops immediately upon reaching the $k$-th element.
-   **Space Complexity**: $O(h)$ — Stack height.

### Java Solution

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public int kthSmallest(TreeNode root, int k) {
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode curr = root;
        
        while (curr != null || !stack.isEmpty()) {
            while (curr != null) {
                stack.push(curr);
                curr = curr.left;
            }
            
            curr = stack.pop();
            if (--k == 0) {
                return curr.val;
            }
            
            curr = curr.right;
        }
        
        return -1;
    }
}
```

---
## 70\. Lowest Common Ancestor of a Binary Search Tree

-   **LeetCode**: [235\. Lowest Common Ancestor of a Binary Search Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/)
-   **Difficulty**: Medium
-   **Pattern**: BST Properties

### Algorithm

1.  Utilize the BST ordering property:
    -   If both `p.val` and `q.val` are strictly less than `root.val`, LCA must reside in left subtree (`root = root.left`).
    -   If both `p.val` and `q.val` are strictly greater than `root.val`, LCA must reside in right subtree (`root = root.right`).
    -   If one is $\le root.val$ and the other is $\ge root.val$, the paths diverge, making `root` the LCA.
2.  Can be implemented iteratively in $O(1)$ space.

### Complexity

-   **Time Complexity**: $O(h)$ — Traverses at most one path from root to leaf.
-   **Space Complexity**: $O(1)$ — Iterative traversal.

### Java Solution

```java
class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        TreeNode curr = root;
        
        while (curr != null) {
            if (p.val < curr.val && q.val < curr.val) {
                curr = curr.left;
            } else if (p.val > curr.val && q.val > curr.val) {
                curr = curr.right;
            } else {
                return curr;
            }
        }
        
        return null;
    }
}
```

---
## 71\. Implement Trie (Prefix Tree)

-   **LeetCode**: [208\. Implement Trie (Prefix Tree)](https://leetcode.com/problems/implement-trie-prefix-tree/)
-   **Difficulty**: Medium
-   **Pattern**: Trie (Prefix Tree)

### Algorithm

1.  Each Trie node contains:
    -   An array of children nodes `TrieNode[26]`.
    -   A boolean `isEnd` marking whether a word terminates at this node.
2.  `insert(word)`: Traverse character by character, creating nodes when absent; mark `isEnd = true` at the final node.
3.  `search(word)`: Traverse character by character; return `true` only if final node is reached and `isEnd == true`.
4.  `startsWith(prefix)`: Traverse prefix; return `true` if all prefix nodes exist.

### Complexity

-   **Time Complexity**: $O(m)$ for `insert`, `search`, and `startsWith`, where $m$ is key length.
-   **Space Complexity**: $O(N \times m)$ where $N$ is number of inserted keys.

### Java Solution

```java
class Trie {
    private static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        boolean isEnd = false;
    }
    
    private final TrieNode root;

    public Trie() {
        root = new TrieNode();
    }
    
    public void insert(String word) {
        TrieNode curr = root;
        for (char c : word.toCharArray()) {
            int idx = c - 'a';
            if (curr.children[idx] == null) {
                curr.children[idx] = new TrieNode();
            }
            curr = curr.children[idx];
        }
        curr.isEnd = true;
    }
    
    public boolean search(String word) {
        TrieNode node = searchPrefix(word);
        return node != null && node.isEnd;
    }
    
    public boolean startsWith(String prefix) {
        return searchPrefix(prefix) != null;
    }
    
    private TrieNode searchPrefix(String prefix) {
        TrieNode curr = root;
        for (char c : prefix.toCharArray()) {
            int idx = c - 'a';
            if (curr.children[idx] == null) return null;
            curr = curr.children[idx];
        }
        return curr;
    }
}
```

---
# Trie & Heap

## 72\. Design Add and Search Words Data Structure

-   **LeetCode**: [211\. Design Add and Search Words Data Structure](https://leetcode.com/problems/design-add-and-search-words-data-structure/)
-   **Difficulty**: Medium
-   **Pattern**: Trie / Backtracking DFS

### Algorithm

1.  Store words in a Trie.
2.  For regular characters, navigate down the corresponding `children[c - 'a']`.
3.  For the wildcard character `'.'`:
    -   Iterate through all 26 possible non-null children.
    -   Recursively search the remainder of the word from each child.
    -   If any branch returns `true`, return `true`.
4.  If end of word is reached, return `node.isEnd`.

### Complexity

-   **Time Complexity**:
    -   `addWord`: $O(m)$ where $m$ is word length.
    -   `search`: $O(m)$ for words without `'.'`; worst case $O(26^m)$ with wildcards.
-   **Space Complexity**: $O(N \times m)$ for Trie storage.

### Java Solution

```java
class WordDictionary {
    private static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        boolean isEnd = false;
    }
    
    private final TrieNode root;

    public WordDictionary() {
        root = new TrieNode();
    }
    
    public void addWord(String word) {
        TrieNode curr = root;
        for (char c : word.toCharArray()) {
            int idx = c - 'a';
            if (curr.children[idx] == null) {
                curr.children[idx] = new TrieNode();
            }
            curr = curr.children[idx];
        }
        curr.isEnd = true;
    }
    
    public boolean search(String word) {
        return match(word.toCharArray(), 0, root);
    }
    
    private boolean match(char[] chars, int k, TrieNode node) {
        if (k == chars.length) return node.isEnd;
        
        char c = chars[k];
        if (c == '.') {
            for (int i = 0; i < 26; i++) {
                if (node.children[i] != null && match(chars, k + 1, node.children[i])) {
                    return true;
                }
            }
            return false;
        } else {
            int idx = c - 'a';
            return node.children[idx] != null && match(chars, k + 1, node.children[idx]);
        }
    }
}
```

---
## 73\. Word Search II

-   **LeetCode**: [212\. Word Search II](https://leetcode.com/problems/word-search-ii/)
-   **Difficulty**: Hard
-   **Pattern**: Trie + Backtracking DFS

### Algorithm

1.  Build a Trie containing all words from `words`. Store the full word at the leaf node (`node.word = word`) to avoid rebuilding strings during traversal.
2.  Iterate through every cell `(r, c)` on the board:
    -   If `board[r][c]` matches a root child in the Trie, launch DFS backtracking from that cell.
3.  In DFS:
    -   Check bounds and whether cell is visited (`#`).
    -   If node has `word != null`, add `word` to results and set `node.word = null` (prevents duplicate additions).
    -   Temporarily mark cell visited: `board[r][c] = '#'`.
    -   Explore 4 directions.
    -   Backtrack: restore `board[r][c]`.
4.  Optimization: Prune Trie leaf nodes when all children are null to dramatically speed up subsequent searches.

### Complexity

-   **Time Complexity**: $O(M \times N \times 4 \times 3^{L-1})$ where $L$ is maximum word length and $M \times N$ is board dimensions.
-   **Space Complexity**: $O(K \times L)$ where $K$ is total words and $L$ is average word length.

### Java Solution

```java
import java.util.*;

class Solution {
    private static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        String word = null;
    }
    
    public List<String> findWords(char[][] board, String[] words) {
        List<String> result = new ArrayList<>();
        TrieNode root = buildTrie(words);
        
        for (int r = 0; r < board.length; r++) {
            for (int c = 0; c < board[0].length; c++) {
                dfs(board, r, c, root, result);
            }
        }
        
        return result;
    }
    
    private void dfs(char[][] board, int r, int c, TrieNode node, List<String> result) {
        if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) return;
        char ch = board[r][c];
        if (ch == '#' || node.children[ch - 'a'] == null) return;
        
        node = node.children[ch - 'a'];
        if (node.word != null) {
            result.add(node.word);
            node.word = null; // Avoid duplicate entries
        }
        
        board[r][c] = '#'; // Mark visited
        dfs(board, r + 1, c, node, result);
        dfs(board, r - 1, c, node, result);
        dfs(board, r, c + 1, node, result);
        dfs(board, r, c - 1, node, result);
        board[r][c] = ch;  // Backtrack
    }
    
    private TrieNode buildTrie(String[] words) {
        TrieNode root = new TrieNode();
        for (String w : words) {
            TrieNode curr = root;
            for (char c : w.toCharArray()) {
                int idx = c - 'a';
                if (curr.children[idx] == null) {
                    curr.children[idx] = new TrieNode();
                }
                curr = curr.children[idx];
            }
            curr.word = w;
        }
        return root;
    }
}
```

---
## 74\. Top K Frequent Elements

-   **LeetCode**: [347\. Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/)
-   **Difficulty**: Medium
-   **Pattern**: Bucket Sort / Min-Heap

### Algorithm

1.  Count frequencies of each number using a `HashMap<Integer, Integer>`.
2.  Use **Bucket Sort**: create an array of lists `List<Integer>[] buckets` of size `nums.length + 1`, where index `f` stores all elements with frequency `f`.
3.  Iterate from the highest frequency bucket `nums.length` down to 0:
    -   Add elements to the result array until $k$ elements are gathered.
4.  Bucket sort runs in optimal $O(n)$ time compared to $O(n \log k)$ for heap.

### Complexity

-   **Time Complexity**: $O(n)$ — Linear scan to count frequencies and bucket sort.
-   **Space Complexity**: $O(n)$ — Frequency map and bucket arrays.

### Java Solution

```java
import java.util.*;

class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> countMap = new HashMap<>();
        for (int num : nums) {
            countMap.put(num, countMap.getOrDefault(num, 0) + 1);
        }
        
        List<Integer>[] buckets = new List[nums.length + 1];
        for (int key : countMap.keySet()) {
            int freq = countMap.get(key);
            if (buckets[freq] == null) {
                buckets[freq] = new ArrayList<>();
            }
            buckets[freq].add(key);
        }
        
        int[] result = new int[k];
        int idx = 0;
        
        for (int i = buckets.length - 1; i >= 0 && idx < k; i--) {
            if (buckets[i] != null) {
                for (int num : buckets[i]) {
                    result[idx++] = num;
                    if (idx == k) break;
                }
            }
        }
        
        return result;
    }
}
```

---
## 75\. Find Median from Data Stream

-   **LeetCode**: [295\. Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream/)
-   **Difficulty**: Hard
-   **Pattern**: Two Heaps (Max-Heap & Min-Heap)

### Algorithm

1.  Maintain two heaps to divide numbers into lower and upper halves:
    -   `maxHeap`: stores the smaller half of numbers (max element at top).
    -   `minHeap`: stores the larger half of numbers (min element at top).
2.  Balance property:
    -   `maxHeap.size() == minHeap.size()` (even count) or `maxHeap.size() == minHeap.size() + 1` (odd count).
3.  `addNum(num)`:
    -   Push to `maxHeap`.
    -   Balance order: pop largest from `maxHeap` and push to `minHeap`.
    -   Balance sizes: if `minHeap.size() > maxHeap.size()`, pop smallest from `minHeap` and push to `maxHeap`.
4.  `findMedian()`:
    -   If `maxHeap.size() > minHeap.size()`, return `maxHeap.peek()`.
    -   Otherwise, return `(maxHeap.peek() + minHeap.peek()) / 2.0`.

### Complexity

-   **Time Complexity**:
    -   `addNum`: $O(\log n)$ — Heap insertion and balancing.
    -   `findMedian`: $O(1)$ — Reading root of heaps.
-   **Space Complexity**: $O(n)$ — Two heaps storing all elements.

### Java Solution

```java
import java.util.Collections;
import java.util.PriorityQueue;

class MedianFinder {
    private PriorityQueue<Integer> maxHeap; // Lower half
    private PriorityQueue<Integer> minHeap; // Upper half

    public MedianFinder() {
        maxHeap = new PriorityQueue<>(Collections.reverseOrder());
        minHeap = new PriorityQueue<>();
    }
    
    public void addNum(int num) {
        maxHeap.offer(num);
        minHeap.offer(maxHeap.poll());
        
        if (maxHeap.size() < minHeap.size()) {
            maxHeap.offer(minHeap.poll());
        }
    }
    
    public double findMedian() {
        if (maxHeap.size() > minHeap.size()) {
            return maxHeap.peek();
        } else {
            return (maxHeap.peek() + minHeap.peek()) / 2.0;
        }
    }
}
```