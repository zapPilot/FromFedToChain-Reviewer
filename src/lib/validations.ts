import { z } from "zod";

export const reviewFormSchema = z
  .object({
    action: z.enum(["accept", "reject"], {
      message: "Please select an action",
    }),
    feedback: z.string(),
    newCategory: z.string().optional(),
  })
  .refine(
    (data) => {
      // Feedback is required when rejecting
      if (data.action === "reject") {
        return data.feedback && data.feedback.trim().length > 0;
      }
      return true;
    },
    {
      message: "Feedback is required when rejecting content",
      path: ["feedback"],
    }
  );

export type ReviewFormData = z.infer<typeof reviewFormSchema>;
